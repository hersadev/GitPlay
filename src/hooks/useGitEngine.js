import { useCallback } from 'react';
import { useGitStore } from '../store/gitStore';
import { parseCommand } from '../engine/CommandParser';

export function useGitEngine() {
  const { repoState, applyCommand, resetRepo } = useGitStore();

  const runCommand = useCallback(
    (input) => {
      const parsed = parseCommand(input);
      if (!parsed.valid) return { ok: false, output: parsed.error };
      return applyCommand(parsed);
    },
    [applyCommand]
  );

  return { repoState, runCommand, resetRepo };
}
