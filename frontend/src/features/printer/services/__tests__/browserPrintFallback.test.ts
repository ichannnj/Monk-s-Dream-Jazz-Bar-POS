import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../shared/utils/printHelpers', () => ({
  printHtmlElement: vi.fn(() => true),
}));

import { extractPrintableTextFromEscPos } from '../browserPrintFallback';
import { buildBillStatementBytes } from '../escposSpecialSlips';

describe('extractPrintableTextFromEscPos', () => {
  it('strips ESC/POS binary sequences (raster logo, drawer kick, cut) and preserves readable receipt text', () => {
    const billBytes = buildBillStatementBytes(
      {
        tabNumber: 'TAB-001',
        tableLabel: 'Table Cafe 2',
        tabName: 'Cj',
        waiterName: 'Miles',
        items: [
          {
            name: 'Cold Brew (Iced - 16oz)',
            quantity: 1,
            price: 280,
            total: 280,
            modifiers: ['Espresso Shot (+P50.00)'],
          },
        ],
        subtotal: 280,
        total: 280,
      },
      '58mm'
    );

    const text = extractPrintableTextFromEscPos(billBytes);
    expect(text).toContain('Jazz Cafe and Bar');
    expect(text).toContain('Cold Brew (Iced -');
    expect(text).toContain('230.00');
    expect(text).toContain('Espresso Shot (+P50.00)');
    expect(text).toContain('UNPAID - PLEASE PAY AT CASHIER');
    // Should not leak binary raster bytes or ESC/GS control codes
    const hasControlChars = Array.from(text).some((ch) => {
      const code = ch.charCodeAt(0);
      return (code >= 0x00 && code <= 0x08) || (code >= 0x0b && code <= 0x1f);
    });
    expect(hasControlChars).toBe(false);
  });
});
