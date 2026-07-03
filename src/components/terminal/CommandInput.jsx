import { useState, useRef } from 'react';

const COMMANDS = [
  'add', 'branch', 'checkout', 'cherry-pick', 'commit', 'diff',
  'fetch', 'init', 'log', 'merge', 'pull', 'push', 'rebase',
  'reflog', 'reset', 'restore', 'revert', 'stash', 'status', 'switch', 'tag',
  '--help', '-h', 'help',
];

function autocomplete(text, repoState) {
  const endsWithSpace = /\s$/.test(text);
  const tokens = text.trim().length ? text.trim().split(/\s+/) : [];

  // 1) Sin nada o escribiendo "git"
  if (tokens.length === 0) return 'git ';
  if (tokens.length === 1 && !endsWithSpace) {
    if ('git'.startsWith(tokens[0])) return 'git ';
    return null;
  }
  if (tokens[0] !== 'git') return null;

  // 2) Completar el comando: "git ad" → "git add "
  if (tokens.length === 1 && endsWithSpace) return text; // ya está "git "
  if (tokens.length === 2 && !endsWithSpace) {
    const partial = tokens[1];
    const matches = COMMANDS.filter((c) => c.startsWith(partial));
    if (matches.length === 1) return `git ${matches[0]} `;
    if (matches.length > 1) {
      // prefijo común
      const common = commonPrefix(matches);
      if (common.length > partial.length) return `git ${common}`;
    }
    return null;
  }

  // 3) Completar el argumento según el comando
  const cmd = tokens[1];
  const partial = endsWithSpace ? '' : tokens[tokens.length - 1];
  const before = endsWithSpace ? text : text.slice(0, text.length - partial.length);

  const branchCmds = new Set(['branch', 'checkout', 'switch', 'merge', 'rebase', 'push', 'pull']);
  const fileCmds = new Set(['add', 'restore']);

  if (branchCmds.has(cmd)) {
    const branches = [...(repoState?.branches?.keys?.() ?? [])];
    const m = branches.filter((b) => b.startsWith(partial));
    if (m.length === 1) return before + m[0] + ' ';
    if (m.length > 1) {
      const common = commonPrefix(m);
      if (common.length > partial.length) return before + common;
    }
    return null;
  }

  if (fileCmds.has(cmd)) {
    const files = [
      ...(repoState?.workingDirectory?.keys?.() ?? []),
      ...(repoState?.stagingArea?.keys?.() ?? []),
    ];
    const m = files.filter((f) => f.startsWith(partial));
    if (m.length === 1) return before + m[0] + ' ';
    if (m.length > 1) {
      const common = commonPrefix(m);
      if (common.length > partial.length) return before + common;
    }
    return null;
  }

  return null;
}

function commonPrefix(arr) {
  if (!arr.length) return '';
  let p = arr[0];
  for (let i = 1; i < arr.length; i++) {
    while (!arr[i].startsWith(p)) p = p.slice(0, -1);
    if (!p) return '';
  }
  return p;
}

export default function CommandInput({ onSubmit, repoState, commandHistory = [] }) {
  const [value, setValue] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1); // -1 = no navegando
  const draftRef = useRef('');

  function handleKeyDown(e) {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
      setValue('');
      setHistoryIdx(-1);
      draftRef.current = '';
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const completed = autocomplete(value, repoState);
      if (completed && completed !== value) setValue(completed);
      return;
    }
    if (e.key === 'ArrowUp') {
      if (!commandHistory.length) return;
      e.preventDefault();
      if (historyIdx === -1) draftRef.current = value;
      const newIdx = Math.min(historyIdx + 1, commandHistory.length - 1);
      setHistoryIdx(newIdx);
      setValue(commandHistory[commandHistory.length - 1 - newIdx]);
      return;
    }
    if (e.key === 'ArrowDown') {
      if (historyIdx === -1) return;
      e.preventDefault();
      const newIdx = historyIdx - 1;
      if (newIdx === -1) {
        setHistoryIdx(-1);
        setValue(draftRef.current);
      } else {
        setHistoryIdx(newIdx);
        setValue(commandHistory[commandHistory.length - 1 - newIdx]);
      }
      return;
    }
  }

  function handleChange(e) {
    setValue(e.target.value);
    if (historyIdx !== -1) {
      setHistoryIdx(-1);
      draftRef.current = '';
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-700">
      <span className="text-green-400">$</span>
      <input
        className="flex-1 bg-transparent outline-none text-white caret-green-400"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
