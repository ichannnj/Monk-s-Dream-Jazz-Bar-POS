export class HybridLogicalClock {
  private lastPhysicalTime: number;
  private logicalCounter: number;
  private readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.lastPhysicalTime = 0;
    this.logicalCounter = 0;
  }

  public now(): string {
    const physicalTime = Date.now();

    if (physicalTime > this.lastPhysicalTime) {
      this.lastPhysicalTime = physicalTime;
      this.logicalCounter = 0;
    } else {
      this.logicalCounter++;
    }

    const pt = this.lastPhysicalTime.toString().padStart(16, '0');
    const lc = this.logicalCounter.toString().padStart(6, '0');
    return `${pt}:${lc}:${this.nodeId}`;
  }

  public update(remoteHlc: string): string {
    const parts = remoteHlc.split(':');
    const remotePhysical = parseInt(parts[0] || '0', 10);
    const remoteLogical = parseInt(parts[1] || '0', 10);
    const localPhysical = Date.now();

    if (localPhysical > this.lastPhysicalTime && localPhysical > remotePhysical) {
      this.lastPhysicalTime = localPhysical;
      this.logicalCounter = 0;
    } else if (this.lastPhysicalTime === remotePhysical) {
      this.logicalCounter = Math.max(this.logicalCounter, remoteLogical) + 1;
    } else if (this.lastPhysicalTime > remotePhysical) {
      this.logicalCounter++;
    } else {
      this.lastPhysicalTime = remotePhysical;
      this.logicalCounter = remoteLogical + 1;
    }

    const pt = this.lastPhysicalTime.toString().padStart(16, '0');
    const lc = this.logicalCounter.toString().padStart(6, '0');
    return `${pt}:${lc}:${this.nodeId}`;
  }
}
