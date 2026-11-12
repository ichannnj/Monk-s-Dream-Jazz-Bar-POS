import { describe, it, expect } from 'vitest';
import { aggregateReceiptItems } from './receiptItemAggregator';

describe('aggregateReceiptItems', () => {
  it('returns empty array when given empty input', () => {
    expect(aggregateReceiptItems([])).toEqual([]);
    expect(aggregateReceiptItems(null as any)).toEqual([]);
  });

  it('aggregates identical items across different rounds', () => {
    const round1 = [
      {
        id: '1',
        productName: 'Cortado',
        unitPrice: 160,
        quantity: 1,
        temperature: 'HOT',
        size: '12oz',
      },
    ];
    const round2 = [
      {
        id: '2',
        productName: 'Cortado',
        unitPrice: 160,
        quantity: 1,
        temperature: 'HOT',
        size: '12oz',
      },
    ];

    const result = aggregateReceiptItems([...round1, ...round2]);
    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('Cortado');
    expect(result[0].quantity).toBe(2);
    expect(result[0].total).toBe(320);
  });

  it('keeps items with different notes on separate lines', () => {
    const items = [
      { id: '1', productName: 'Cortado', unitPrice: 160, quantity: 1, notes: 'Oat milk' },
      { id: '2', productName: 'Cortado', unitPrice: 160, quantity: 1, notes: 'Almond milk' },
    ];

    const result = aggregateReceiptItems(items);
    expect(result).toHaveLength(2);
    expect(result[0].notes).toBe('Oat milk');
    expect(result[1].notes).toBe('Almond milk');
  });

  it('keeps items with different temperatures or sizes on separate lines', () => {
    const items = [
      { id: '1', productName: 'Americano', unitPrice: 140, quantity: 1, temperature: 'HOT' },
      { id: '2', productName: 'Americano', unitPrice: 150, quantity: 1, temperature: 'ICED' },
    ];

    const result = aggregateReceiptItems(items);
    expect(result).toHaveLength(2);
  });

  it('aggregates items with matching modifiers regardless of modifier order', () => {
    const items = [
      {
        id: '1',
        productName: 'Matcha Latte',
        unitPrice: 180,
        quantity: 1,
        modifiers: ['Extra Shot', 'Soy Milk'],
      },
      {
        id: '2',
        productName: 'Matcha Latte',
        unitPrice: 180,
        quantity: 2,
        modifiers: ['Soy Milk', 'Extra Shot'],
      },
    ];

    const result = aggregateReceiptItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].total).toBe(540);
  });
});
