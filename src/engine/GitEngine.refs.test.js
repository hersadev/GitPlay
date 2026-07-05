// Tests de resolución de referencias: tags y HEAD como refs válidas en
// checkout/switch/reset/revert, como en git real.
import { describe, it, expect } from 'vitest';
import { GitEngine } from './GitEngine';

// Repo con dos commits y un tag v0.1.0 apuntando al primero.
function repoConTag() {
  const e = new GitEngine();
  e.init();
  e.workingDirectory.set('a.js', 'v1\n');
  e.add(['a.js']);
  e.commit(['-m', 'primero']);
  e.tag(['v0.1.0']);
  e.workingDirectory.set('a.js', 'v2\n');
  e.add(['a.js']);
  e.commit(['-m', 'segundo']);
  return e;
}

describe('tags como referencia', () => {
  it('git checkout <tag> desacopla HEAD en el commit del tag', () => {
    const e = repoConTag();
    const tagHash = e.tags.get('v0.1.0');
    const r = e.checkout(['v0.1.0']);
    expect(r.ok).toBe(true);
    expect(e.HEAD).toBe(tagHash);
  });

  it('git switch <tag> se rechaza sugiriendo --detach', () => {
    const e = repoConTag();
    const r = e.switch(['v0.1.0']);
    expect(r.ok).toBe(false);
    expect(r.output).toContain('--detach');
  });

  it('git switch --detach <tag> desacopla HEAD', () => {
    const e = repoConTag();
    const r = e.switch(['--detach', 'v0.1.0']);
    expect(r.ok).toBe(true);
    expect(e.HEAD).toBe(e.tags.get('v0.1.0'));
  });

  it('git reset --hard <tag> mueve la rama al commit del tag', () => {
    const e = repoConTag();
    const r = e.gitReset(['--hard', 'v0.1.0']);
    expect(r.ok).toBe(true);
    expect(e.branches.get('main')).toBe(e.tags.get('v0.1.0'));
  });
});

describe('revert con referencias simbólicas', () => {
  it('git revert HEAD crea el commit inverso del último', () => {
    const e = repoConTag();
    const antes = e.branches.get('main');
    const r = e.revert(['HEAD']);
    expect(r.ok).toBe(true);
    const tip = e.branches.get('main');
    expect(tip).not.toBe(antes);
    expect(e.commits.get(tip).parent).toBe(antes);
    expect(e.commits.get(tip).tree.get('a.js')).toBe('v1\n');
  });

  it('git revert <tag> también resuelve', () => {
    const e = repoConTag();
    const r = e.revert(['v0.1.0']);
    expect(r.ok).toBe(true);
  });
});
