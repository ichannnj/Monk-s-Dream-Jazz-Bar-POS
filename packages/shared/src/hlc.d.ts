export declare class HybridLogicalClock {
    private lastPhysicalTime;
    private logicalCounter;
    private readonly nodeId;
    constructor(nodeId: string);
    now(): string;
    update(remoteHlc: string): string;
}
