// ── Diff ──────────────────────────────────────────────────────────────
// Se monta sobre GitEngine.prototype (ver GitEngine.js), por eso usa `this`.

export const diffCommands = {
  diff(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('diff', args);

    const staged = args.includes('--staged') || args.includes('--cached');
    const tree = this._currentTree();

    const blocks = [];
    if (staged) {
      // staging vs último commit
      for (const [name, content] of this.stagingArea.entries()) {
        const before = tree.get(name) ?? '';
        if (before === content) continue;
        blocks.push(this._formatDiff(name, before, content));
      }
    } else {
      // workingDir vs (staging si existe, sino último commit)
      for (const [name, content] of this.workingDirectory.entries()) {
        const before = this.stagingArea.get(name) ?? tree.get(name) ?? '';
        if (before === content) continue;
        blocks.push(this._formatDiff(name, before, content));
      }
    }
    if (!blocks.length) return { ok: true, output: '' };
    return { ok: true, output: blocks.join('\n') };
  },

  _formatDiff(filename, before, after) {
    const beforeLines = before === '' ? [] : before.split('\n');
    const afterLines = after === '' ? [] : after.split('\n');
    const header = [
      `diff --git a/${filename} b/${filename}`,
      before === '' ? `--- /dev/null` : `--- a/${filename}`,
      after === '' ? `+++ /dev/null` : `+++ b/${filename}`,
    ];
    // LCS para hacer un diff de líneas razonable.
    const ops = lcsDiff(beforeLines, afterLines);
    const body = ops.map(({ type, line }) => {
      if (type === 'add') return `+${line}`;
      if (type === 'del') return `-${line}`;
      return ` ${line}`;
    });
    return [...header, ...body].join('\n');
  },
};

// LCS-based line diff. Produce una lista de {type, line} con 'add', 'del', 'ctx'.
function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: 'ctx', line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', line: a[i] }); i++; }
    else { ops.push({ type: 'add', line: b[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'del', line: a[i++] }); }
  while (j < m) { ops.push({ type: 'add', line: b[j++] }); }
  return ops;
}
