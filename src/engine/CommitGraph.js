export class CommitGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addCommit(commit) {
    this.nodes.set(commit.hash, commit);
    if (commit.parent) {
      this.edges.push({ from: commit.hash, to: commit.parent });
    }
    if (commit.secondParent) {
      this.edges.push({ from: commit.hash, to: commit.secondParent });
    }
  }

  getAncestors(hash) {
    const visited = new Set();
    const stack = [hash];
    while (stack.length) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      const node = this.nodes.get(current);
      if (node?.parent) stack.push(node.parent);
      if (node?.secondParent) stack.push(node.secondParent);
    }
    return visited;
  }
}
