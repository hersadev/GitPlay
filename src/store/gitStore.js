import { create } from 'zustand';
import { GitEngine } from '../engine/GitEngine';
import { loadRepo, saveRepo } from '../utils/persistence';

const engine = new GitEngine();

// Restore persisted repo on startup
const saved = loadRepo();
if (saved) engine.loadState(saved);

const COMMANDS = {
  init:           (e, args) => e.init(),
  add:            (e, args) => e.add(args),
  commit:         (e, args) => e.commit(args),
  status:         (e, args) => e.status(),
  log:            (e, args) => e.log(),
  branch:         (e, args) => e.branch(args),
  checkout:       (e, args) => e.checkout(args),
  switch:         (e, args) => e.switch(args),
  merge:          (e, args) => e.merge(args),
  reset:          (e, args) => e.gitReset(args),
  revert:         (e, args) => e.revert(args),
  stash:          (e, args) => e.stash(args),
  tag:            (e, args) => e.tag(args),
  'cherry-pick':  (e, args) => e.cherryPick(args),
  rebase:         (e, args) => e.rebase(args),
  reflog:         (e, args) => e.reflog(),
};

export const useGitStore = create((set) => ({
  repoState: engine.getState(),

  applyCommand(parsed) {
    const handler = COMMANDS[parsed.command];
    const result = handler
      ? handler(engine, parsed.args)
      : { ok: false, output: `git: '${parsed.command}' no es un comando git. Ver 'git --help'.` };

    const newState = engine.getState();
    set({ repoState: newState });
    saveRepo(engine);
    return result;
  },

  resetRepo() {
    engine.clearState();
    const newState = engine.getState();
    set({ repoState: newState });
    saveRepo(engine);
  },
}));
