import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapRawPaymentToCheck, filterSettledChecks } from '../checkMapper';
import { exportChecksRegisterToExcel } from '@/features/admin/utils/excel/exportFinancialAndChecks';
import * as excelXmlCore from '@/features/admin/utils/excel/excelXmlCore';

describe('Sequential Receipt & Bill Serial Numbers', () => {
  it('maps receipt_number and bill_number from PostgreSQL payment + tab rows', () => {
    const check = mapRawPaymentToCheck(
      {
        id: '11111111-2222-3333-4444-555555555555',
        tab_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        receipt_number: 'MD-000042',
        amount: 450,
        payment_method: 'CASH',
        created_at: '2026-11-26T12:00:00Z',
        tabs: {
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          bill_number: 'BILL-000019',
          customer_name: 'Miles Davis',
          order_channel: 'CAFE_AREA',
          operating_mode: 'CAFE',
        },
      },
      new Map()
    );

    expect(check.checkNumber).toBe('MD-000042');
    expect(check.billNumber).toBe('BILL-000019');
  });

  it('filters checks by both Receipt # and Bill #', () => {
    const items = [
      mapRawPaymentToCheck(
        {
          id: '11111111-1111-1111-1111-111111111111',
          tab_id: 't1',
          receipt_number: 'MD-000001',
          amount: 200,
          created_at: '2026-11-26T10:00:00Z',
          tabs: { bill_number: 'BILL-000005', customer_name: 'Guest A' },
        },
        new Map()
      ),
      mapRawPaymentToCheck(
        {
          id: '22222222-2222-2222-2222-222222222222',
          tab_id: 't2',
          receipt_number: 'MD-000002',
          amount: 300,
          created_at: '2026-11-26T11:00:00Z',
          tabs: { bill_number: 'BILL-000006', customer_name: 'Guest B' },
        },
        new Map()
      ),
    ];

    expect(filterSettledChecks(items, { searchQuery: 'MD-000002' })).toHaveLength(1);
    expect(filterSettledChecks(items, { searchQuery: 'BILL-000005' })[0]?.checkNumber).toBe(
      'MD-000001'
    );
  });

  describe('exportChecksRegisterToExcel', () => {
    let capturedBlobContent = '';

    beforeEach(() => {
      capturedBlobContent = '';
      vi.spyOn(excelXmlCore, 'triggerDownload').mockImplementation((xml: string) => {
        capturedBlobContent = xml;
      });
    });

    it('sorts checks ascending by Receipt # and includes Receipt # and Bill # headers', () => {
      const newestFirst = [
        mapRawPaymentToCheck(
          {
            id: '22222222-2222-2222-2222-222222222222',
            tab_id: 't2',
            receipt_number: 'MD-000002',
            amount: 300,
            created_at: '2026-11-26T11:00:00Z',
            tabs: { bill_number: 'BILL-000002', customer_name: 'Second' },
          },
          new Map()
        ),
        mapRawPaymentToCheck(
          {
            id: '11111111-1111-1111-1111-111111111111',
            tab_id: 't1',
            receipt_number: 'MD-000001',
            amount: 200,
            created_at: '2026-11-26T10:00:00Z',
            tabs: { bill_number: 'BILL-000001', customer_name: 'First' },
          },
          new Map()
        ),
      ];

      exportChecksRegisterToExcel(newestFirst, 'Test');

      expect(capturedBlobContent).toContain('>Receipt #<');
      expect(capturedBlobContent).toContain('>Bill #<');
      const idx1 = capturedBlobContent.indexOf('MD-000001');
      const idx2 = capturedBlobContent.indexOf('MD-000002');
      expect(idx1).toBeGreaterThan(-1);
      expect(idx2).toBeGreaterThan(idx1);
    });
  });
});
