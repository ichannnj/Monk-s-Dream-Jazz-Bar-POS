const encoder = new TextEncoder();

export const ESCPOS = {
  INIT: new Uint8Array([0x1b, 0x40]), // ESC @
  CUT_FULL: new Uint8Array([0x1d, 0x56, 0x00]), // GS V 0 (full cut)
  CUT_PARTIAL: new Uint8Array([0x1d, 0x56, 0x01]), // GS V 1 (partial cut)
  DRAWER_KICK_PIN2: new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 25 250 (Pin 2 pulse 50ms)
  DRAWER_KICK_PIN5: new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0xfa]), // ESC p 1 25 250 (Pin 5 pulse 50ms)

  ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]), // ESC a 2

  BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]), // ESC E 0
  DOUBLE_SIZE: new Uint8Array([0x1d, 0x21, 0x11]), // GS ! 0x11 (2x width & 2x height)
  DOUBLE_HEIGHT: new Uint8Array([0x1d, 0x21, 0x01]), // GS ! 0x01
  DOUBLE_WIDTH: new Uint8Array([0x1d, 0x21, 0x10]), // GS ! 0x10
  NORMAL_SIZE: new Uint8Array([0x1d, 0x21, 0x00]), // GS ! 0x00
  UNDERLINE_ON: new Uint8Array([0x1b, 0x2d, 0x01]), // ESC - 1
  UNDERLINE_OFF: new Uint8Array([0x1b, 0x2d, 0x00]), // ESC - 0
};

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];

  constructor() {
    this.add(ESCPOS.INIT);
  }

  public add(bytes: Uint8Array): this {
    this.chunks.push(bytes);
    return this;
  }

  public text(str: string): this {
    this.chunks.push(encoder.encode(str));
    return this;
  }

  public line(str: string = ''): this {
    this.chunks.push(encoder.encode(str + '\n'));
    return this;
  }

  public feed(lines: number = 1): this {
    this.chunks.push(encoder.encode('\n'.repeat(Math.max(1, lines))));
    return this;
  }

  public left(): this {
    return this.add(ESCPOS.ALIGN_LEFT);
  }

  public center(): this {
    return this.add(ESCPOS.ALIGN_CENTER);
  }

  public right(): this {
    return this.add(ESCPOS.ALIGN_RIGHT);
  }

  public bold(enable: boolean = true): this {
    return this.add(enable ? ESCPOS.BOLD_ON : ESCPOS.BOLD_OFF);
  }

  public doubleSize(enable: boolean = true): this {
    return this.add(enable ? ESCPOS.DOUBLE_SIZE : ESCPOS.NORMAL_SIZE);
  }

  public doubleHeight(enable: boolean = true): this {
    return this.add(enable ? ESCPOS.DOUBLE_HEIGHT : ESCPOS.NORMAL_SIZE);
  }

  public imageRaster(rasterBytes: Uint8Array): this {
    return this.add(rasterBytes);
  }

  public qrCode(content: string): this {
    if (!content) return this;
    const dataBytes = encoder.encode(content);
    const storeLen = dataBytes.length + 3;
    const pL = storeLen % 256;
    const pH = Math.floor(storeLen / 256);

    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04]));
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]));
    const storeHeader = new Uint8Array([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]);
    this.add(storeHeader);
    this.add(dataBytes);
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
    this.feed(1);
    return this;
  }

  public cut(full: boolean = true): this {
    this.feed(3);
    return this.add(full ? ESCPOS.CUT_FULL : ESCPOS.CUT_PARTIAL);
  }

  public kickDrawer(): this {
    return this.add(ESCPOS.DRAWER_KICK_PIN2);
  }

  public toBytes(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
