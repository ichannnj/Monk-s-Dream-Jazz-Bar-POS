import { describe, it, expect } from 'vitest';
import {
  getStockStatus,
  calculateSuggestedBuyQty,
  calculateWeightedMac,
  validateRestockInput,
  validateQuickAdjustInput,
  validateInventoryItemInput,
} from '../presentation/views/inventory/utils/inventoryCalculations';

describe('inventoryCalculations', () => {
  describe('getStockStatus', () => {
    it('returns DEPLETED when stock is 0 or negative', () => {
      expect(getStockStatus(0, 5)).toBe('DEPLETED');
      expect(getStockStatus(-1.5, 5)).toBe('DEPLETED');
    });

    it('returns BELOW_PAR when stock is positive and <= par', () => {
      expect(getStockStatus(5, 5)).toBe('BELOW_PAR');
      expect(getStockStatus(0.5, 5)).toBe('BELOW_PAR');
    });

    it('returns IN_PAR when stock exceeds par', () => {
      expect(getStockStatus(5.1, 5)).toBe('IN_PAR');
    });
  });

  describe('calculateSuggestedBuyQty', () => {
    it('computes deficit against explicit targetStockLevel', () => {
      expect(calculateSuggestedBuyQty(2, 5, 12)).toBe(10);
      expect(calculateSuggestedBuyQty(15, 5, 12)).toBe(0);
    });

    it('falls back to 2x par when targetStockLevel is unset and stock is low', () => {
      expect(calculateSuggestedBuyQty(2, 5, null)).toBe(8);
      expect(calculateSuggestedBuyQty(0, 5, undefined)).toBe(10);
      expect(calculateSuggestedBuyQty(6, 5, null)).toBe(0);
    });
  });

  describe('calculateWeightedMac', () => {
    it('computes weighted moving average cost accurately', () => {
      // (10 * 100 + 10 * 200) / 20 = 150
      expect(calculateWeightedMac(10, 100, 10, 200)).toBe(150);
      // (2 * 420 + 8 * 480) / 10 = 468
      expect(calculateWeightedMac(2, 420, 8, 480)).toBe(468);
    });

    it('uses invoice unit cost directly when current stock is 0 or negative', () => {
      expect(calculateWeightedMac(0, 100, 5, 250)).toBe(250);
      expect(calculateWeightedMac(-2, 100, 5, 250)).toBe(250);
    });
  });

  describe('validations', () => {
    it('rejects non-positive restock qty and negative cost', () => {
      expect(validateRestockInput('0', '100').valid).toBe(false);
      expect(validateRestockInput('-3', '100').valid).toBe(false);
      expect(validateRestockInput('5', '-1').valid).toBe(false);
      expect(validateRestockInput('5', '0').valid).toBe(true);
    });

    it('rejects negative physical count or par level', () => {
      expect(validateQuickAdjustInput('-1', '5').valid).toBe(false);
      expect(validateQuickAdjustInput('3', '-2').valid).toBe(false);
      expect(validateQuickAdjustInput('0', '5').valid).toBe(true);
    });

    it('validates targetStockLevel >= minAlertLevel when provided', () => {
      expect(
        validateInventoryItemInput({
          name: 'Oat Milk',
          sku: 'DRY-001',
          minAlertLevel: '6',
          targetStockLevel: '4',
          unitCost: '150',
          currentStock: '2',
          isEditing: false,
        }).valid
      ).toBe(false);

      expect(
        validateInventoryItemInput({
          name: 'Oat Milk',
          sku: 'DRY-001',
          minAlertLevel: '6',
          targetStockLevel: '12',
          unitCost: '150',
          currentStock: '2',
          isEditing: false,
        }).valid
      ).toBe(true);
    });
  });
});
