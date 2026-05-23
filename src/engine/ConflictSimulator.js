export class ConflictSimulator {
  constructor() {
    this.activeConflicts = [];
  }

  generateConflict(base, ours, theirs) {
    return {
      base,
      ours,
      theirs,
      resolved: false,
    };
  }

  resolve(conflict, resolution) {
    conflict.resolved = true;
    conflict.resolution = resolution;
    return conflict;
  }

  hasUnresolved() {
    return this.activeConflicts.some((c) => !c.resolved);
  }
}
