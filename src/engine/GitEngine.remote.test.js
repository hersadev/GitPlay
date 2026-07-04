// Tests del flujo con origin: protección de cambios locales sin commitear en
// merge/pull (como git real, que aborta en vez de pisarlos) y flags de push.
import { describe, it, expect } from 'vitest';
import { GitEngine } from './GitEngine';

// Repo local con README commiteado y pusheado, y una edición de la compañera
// en origin que el local aún no tiene (el escenario de gh-l6).
function repoConRemotoDivergente() {
  const e = new GitEngine();
  e.init();
  e.workingDirectory.set('README.md', 'base\n');
  e.add(['README.md']);
  e.commit(['-m', 'base']);
  e.push(['origin', 'main']);
  e.seedRemoteCommit('main', {
    message: 'docs: edición de la compañera',
    files: { 'README.md': 'suyo\n' },
  });
  return e;
}

describe('pull con cambios locales sin commitear', () => {
  it('aborta si el fast-forward pisaría un archivo editado', () => {
    const e = repoConRemotoDivergente();
    e.editFile('README.md', 'mío sin commitear\n');
    const r = e.pull([]);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('sobrescritos');
    expect(r.output).toContain('README.md');
    // Ni se movió la rama ni se perdió la edición local.
    expect(e.branches.get('main')).not.toBe(e.remoteBranches.get('main'));
    expect(e.workingDirectory.get('README.md')).toBe('mío sin commitear\n');
  });

  it('aborta también si el cambio está en staging', () => {
    const e = repoConRemotoDivergente();
    e.editFile('README.md', 'mío sin commitear\n');
    e.add(['README.md']);
    const r = e.pull([]);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('sobrescritos');
  });

  it('no molesta si el archivo sucio no lo toca el merge', () => {
    const e = repoConRemotoDivergente();
    e.editFile('notas.txt', 'apuntes míos\n');
    const r = e.pull([]);
    expect(r.ok).toBe(true);
    expect(e.branches.get('main')).toBe(e.remoteBranches.get('main'));
    expect(e.workingDirectory.get('notas.txt')).toBe('apuntes míos\n');
  });

  it('con la edición commiteada, el pull sí deja el conflicto abierto (gh-l6)', () => {
    const e = repoConRemotoDivergente();
    e.editFile('README.md', 'mío\n');
    e.add(['README.md']);
    e.commit(['-m', 'mi edición']);
    const r = e.pull([]);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('CONFLICTO');
    expect(e.mergeState?.conflicts?.has('README.md')).toBe(true);
  });
});

describe('merge con cambios locales sin commitear', () => {
  it('aborta si la rama a mergear toca un archivo editado', () => {
    const e = new GitEngine();
    e.init();
    e.workingDirectory.set('f.txt', 'base\n');
    e.add(['f.txt']);
    e.commit(['-m', 'base']);
    e.branch(['otra']);
    e.switch(['otra']);
    e.editFile('f.txt', 'en otra\n');
    e.add(['f.txt']);
    e.commit(['-m', 'cambio en otra']);
    e.switch(['main']);
    e.editFile('f.txt', 'sucio\n');
    const r = e.merge(['otra']);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('sobrescritos');
    expect(e.mergeState).toBe(null);
    expect(e.workingDirectory.get('f.txt')).toBe('sucio\n');
  });
});

describe('push con flags', () => {
  function repoConUnCommit() {
    const e = new GitEngine();
    e.init();
    e.workingDirectory.set('a.txt', 'x\n');
    e.add(['a.txt']);
    e.commit(['-m', 'uno']);
    return e;
  }

  it('acepta -u origin main y lo refleja en la salida', () => {
    const e = repoConUnCommit();
    const r = e.push(['-u', 'origin', 'main']);
    expect(r.ok).toBe(true);
    expect(e.remoteBranches.get('main')).toBe(e.branches.get('main'));
    expect(r.output).toContain("seguir a 'origin/main'");
  });

  it('acepta --set-upstream', () => {
    const e = repoConUnCommit();
    const r = e.push(['--set-upstream', 'origin', 'main']);
    expect(r.ok).toBe(true);
    expect(e.remoteBranches.get('main')).toBe(e.branches.get('main'));
  });

  it('rechaza flags no soportados con un mensaje claro', () => {
    const e = repoConUnCommit();
    const r = e.push(['--force']);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('--force');
    expect(e.remoteBranches.has('main')).toBe(false);
  });
});
