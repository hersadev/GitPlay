// Tests del flujo de conflictos: merge con marcadores por zona, rebase con
// conflicto (--continue / --abort) y la lección m4-l5b de principio a fin.
import { describe, it, expect } from 'vitest';
import { GitEngine } from './GitEngine';
import {
  parseConflictSegments,
  buildResolvedContent,
  hasConflictMarkers,
} from '../utils/conflicts';
import { module4 } from '../lessons/module4';
import { BADGES } from '../utils/badges';

const BASE = 'a\nb\nc\nd\n';
const OURS = 'a\nb\nMIO\nc\nd\n';
const THEIRS = 'a\nb\nSUYO\nc\nd\n';

// Repo con base en main, OURS commiteado en main y THEIRS en `otra`.
function repoConDivergencia() {
  const e = new GitEngine();
  e.init();
  e.workingDirectory.set('f.txt', BASE);
  e.add(['f.txt']);
  e.commit(['-m', 'base']);
  e.branch(['otra']);
  e.workingDirectory.set('f.txt', OURS);
  e.add(['f.txt']);
  e.commit(['-m', 'mio']);
  e.switch(['otra']);
  e.workingDirectory.set('f.txt', THEIRS);
  e.add(['f.txt']);
  e.commit(['-m', 'suyo']);
  e.switch(['main']);
  return e;
}

// Base en main, compañero avanza main, tu commit queda en `feature`.
function repoParaRebase() {
  const e = new GitEngine();
  e.init();
  e.workingDirectory.set('f.txt', BASE);
  e.add(['f.txt']);
  e.commit(['-m', 'base']);
  e.branch(['feature']);
  e.workingDirectory.set('f.txt', THEIRS);
  e.add(['f.txt']);
  e.commit(['-m', 'cambio companero']);
  e.switch(['feature']);
  e.workingDirectory.set('f.txt', OURS);
  e.add(['f.txt']);
  e.commit(['-m', 'cambio mio']);
  return e;
}

describe('merge con conflicto', () => {
  it('genera marcadores solo en la zona que difiere', () => {
    const e = repoConDivergencia();
    const r = e.merge(['otra']);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('CONFLICTO');

    const content = e.workingDirectory.get('f.txt');
    expect(hasConflictMarkers(content)).toBe(true);
    const lines = content.split('\n');
    expect(lines[0]).toBe('a'); // prefijo común fuera del bloque
    expect(lines[1]).toBe('b');

    const conflicts = parseConflictSegments(content).filter((s) => s.type === 'conflict');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].ours).toEqual(['MIO']);
    expect(conflicts[0].theirs).toEqual(['SUYO']);
  });

  it('se resuelve conservando ambos y commiteando', () => {
    const e = repoConDivergencia();
    e.merge(['otra']);
    const segs = parseConflictSegments(e.workingDirectory.get('f.txt'));
    const both = buildResolvedContent(segs, ['both']);
    expect(both).toBe('a\nb\nMIO\nSUYO\nc\nd\n');
    e.editFile('f.txt', both);
    e.add(['f.txt']);
    const c = e.commit([]);
    expect(c.ok).toBe(true);
    expect(e.mergeState).toBeNull();
  });

  it('se resuelve eligiendo exactamente nuestra versión (add especial)', () => {
    const e = repoConDivergencia();
    e.merge(['otra']);
    e.editFile('f.txt', OURS); // igual a HEAD → sale del working dir
    expect(e.workingDirectory.has('f.txt')).toBe(false);
    e.add(['f.txt']);
    expect(e.stagingArea.has('f.txt')).toBe(true);
    const c = e.commit([]);
    expect(c.ok).toBe(true);
    expect(e.mergeState).toBeNull();
  });
});

describe('rebase con conflicto', () => {
  it('se pausa con marcadores y la semántica invertida (ours = nueva base)', () => {
    const e = repoParaRebase();
    const r = e.rebase(['main']);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('CONFLICTO');
    expect(e.rebaseState).not.toBeNull();
    expect(e.HEAD).toBe('feature');
    expect(e.status().output).toContain('Rebase en curso');

    const conf = parseConflictSegments(e.workingDirectory.get('f.txt'))
      .find((s) => s.type === 'conflict');
    expect(conf.ours).toEqual(['SUYO']);   // lo que ya está en main
    expect(conf.theirs).toEqual(['MIO']);  // tu commit reaplicado
  });

  it('bloquea commit, switch, merge y reset mientras dura', () => {
    const e = repoParaRebase();
    e.rebase(['main']);
    expect(e.commit(['-m', 'x']).ok).toBe(false);
    expect(e.switch(['main']).ok).toBe(false);
    expect(e.merge(['main']).ok).toBe(false);
    expect(e.gitReset(['--hard', 'HEAD~1']).ok).toBe(false);
  });

  it('--continue reaplica el commit con la resolución y deja historia lineal', () => {
    const e = repoParaRebase();
    e.rebase(['main']);
    const segs = parseConflictSegments(e.workingDirectory.get('f.txt'));
    e.editFile('f.txt', buildResolvedContent(segs, ['both']));
    e.add(['f.txt']);
    const cont = e.rebase(['--continue']);
    expect(cont.ok).toBe(true);
    expect(e.rebaseState).toBeNull();

    const tip = e.commits.get(e.branches.get('feature'));
    expect(tip.parent).toBe(e.branches.get('main'));
    expect(tip.message).toBe('cambio mio');
    expect(tip.tree.get('f.txt')).toBe('a\nb\nSUYO\nMIO\nc\nd\n');
  });

  it('--abort restaura la rama, borra commits a medias y limpia el workspace', () => {
    const e = repoParaRebase();
    const tipBefore = e.branches.get('feature');
    const commitsBefore = e.commits.size;
    e.rebase(['main']);
    const ab = e.rebase(['--abort']);
    expect(ab.ok).toBe(true);
    expect(e.rebaseState).toBeNull();
    expect(e.branches.get('feature')).toBe(tipBefore);
    expect(e.commits.size).toBe(commitsBefore);
    expect(e.workingDirectory.has('f.txt')).toBe(false);
    expect(e.stagingArea.size).toBe(0);
  });

  it('sin conflictos sigue funcionando como antes', () => {
    const e = new GitEngine();
    e.init();
    e.workingDirectory.set('a.js', 'A');
    e.add(['a.js']);
    e.commit(['-m', 'base']);
    e.switch(['-c', 'feature/dashboard']);
    e.workingDirectory.set('Dashboard.jsx', 'D');
    e.add(['Dashboard.jsx']);
    e.commit(['-m', 'dashboard']);
    e.switch(['main']);
    e.workingDirectory.set('metrics.js', 'M');
    e.add(['metrics.js']);
    e.commit(['-m', 'metricas']);
    e.switch(['feature/dashboard']);
    const r = e.rebase(['main']);
    expect(r.ok).toBe(true);
    expect(e.rebaseState).toBeNull();
    const tip = e.commits.get(e.branches.get('feature/dashboard'));
    expect(tip.tree.get('Dashboard.jsx')).toBe('D');
    expect(tip.tree.get('metrics.js')).toBe('M');
    expect(tip.parent).toBe(e.branches.get('main'));
  });

  it('exige árbol limpio (staged o tracked modificados bloquean, untracked no)', () => {
    const e = repoParaRebase();
    e.workingDirectory.set('nuevo.txt', 'x'); // untracked: permitido
    e.workingDirectory.set('f.txt', 'modificado'); // tracked modificado: bloquea
    expect(e.rebase(['main']).ok).toBe(false);
    e.workingDirectory.delete('f.txt');
    expect(e.rebase(['main']).ok).toBe(false); // se pausa por conflicto igualmente
    expect(e.rebaseState).not.toBeNull();
  });
});

describe('lección m4-l5b (rebase con conflicto)', () => {
  it('el escenario y los objetivos funcionan de principio a fin', () => {
    const lesson = module4.find((l) => l.id === 'm4-l5b');
    expect(lesson).toBeDefined();

    const e = new GitEngine();
    e.init();
    e.workingDirectory.set('README.md', 'hola');
    e.add(['README.md']);
    e.commit(['-m', 'primer commit']);

    lesson.setup(e);
    lesson.setup(e); // idempotente
    expect(e.branches.has('feature/precios')).toBe(true);
    expect(e.commits.get(e.branches.get('main')).message).toBe('feat: plan enterprise');

    let s = e.getState();
    expect(lesson.objectives[0].validate(s)).toBe(false);

    e.switch(['feature/precios']);
    s = e.getState();
    expect(lesson.objectives[0].validate(s)).toBe(true);
    expect(lesson.objectives[1].validate(s)).toBe(false);

    const r = e.rebase(['main']);
    expect(r.ok).toBe(false);
    expect(e.rebaseState.conflicts.has('precios.js')).toBe(true);
    s = e.getState();
    expect(lesson.objectives[1].validate(s)).toBe(true);
    expect(lesson.objectives[2].validate(s)).toBe(false);

    const segs = parseConflictSegments(e.workingDirectory.get('precios.js'));
    expect(segs.filter((x) => x.type === 'conflict')).toHaveLength(1);
    const both = buildResolvedContent(segs, ['both']);
    expect(both).toContain('enterprise');
    expect(both).toContain('anual');
    e.editFile('precios.js', both);
    e.add(['precios.js']);
    expect(e.rebase(['--continue']).ok).toBe(true);

    s = e.getState();
    expect(lesson.objectives[0].validate(s)).toBe(true);
    expect(lesson.objectives[1].validate(s)).toBe(true);
    expect(lesson.objectives[2].validate(s)).toBe(true);
  });
});

describe('logros de conflictos', () => {
  const badge = (id) => BADGES.find((b) => b.id === id);

  it('Houston se desbloquea al toparte con el conflicto', () => {
    const e = repoParaRebase();
    expect(badge('conflict-survivor').check({ repoState: e.getState() })).toBe(false);
    e.rebase(['main']);
    expect(badge('conflict-survivor').check({ repoState: e.getState() })).toBe(true);
  });

  it('Cirujano del rebase distingue rebase con conflictos de rebase limpio', () => {
    // Rebase con conflicto resuelto → logro.
    const e = repoParaRebase();
    e.rebase(['main']);
    const segs = parseConflictSegments(e.workingDirectory.get('f.txt'));
    e.editFile('f.txt', buildResolvedContent(segs, ['both']));
    e.add(['f.txt']);
    e.rebase(['--continue']);
    expect(e.reflogHistory[0].message).toContain('(conflictos resueltos)');
    expect(badge('rebase-surgeon').check({ repoState: e.getState() })).toBe(true);
    expect(badge('rebaser').check({ repoState: e.getState() })).toBe(true);

    // Rebase limpio → Maestro del rebase sí, Cirujano no.
    const e2 = new GitEngine();
    e2.init();
    e2.workingDirectory.set('a.js', 'A');
    e2.add(['a.js']);
    e2.commit(['-m', 'base']);
    e2.switch(['-c', 'feature']);
    e2.workingDirectory.set('b.js', 'B');
    e2.add(['b.js']);
    e2.commit(['-m', 'feature']);
    e2.switch(['main']);
    e2.workingDirectory.set('c.js', 'C');
    e2.add(['c.js']);
    e2.commit(['-m', 'main avanza']);
    e2.switch(['feature']);
    expect(e2.rebase(['main']).ok).toBe(true);
    expect(badge('rebaser').check({ repoState: e2.getState() })).toBe(true);
    expect(badge('rebase-surgeon').check({ repoState: e2.getState() })).toBe(false);
  });

  it('Pacificador se desbloquea al concluir un merge con conflictos', () => {
    const e = repoConDivergencia();
    e.merge(['otra']);
    expect(badge('conflict-survivor').check({ repoState: e.getState() })).toBe(true);
    expect(badge('conflict-resolver').check({ repoState: e.getState() })).toBe(false);
    const segs = parseConflictSegments(e.workingDirectory.get('f.txt'));
    e.editFile('f.txt', buildResolvedContent(segs, ['both']));
    e.add(['f.txt']);
    e.commit([]);
    expect(badge('conflict-resolver').check({ repoState: e.getState() })).toBe(true);
  });
});
