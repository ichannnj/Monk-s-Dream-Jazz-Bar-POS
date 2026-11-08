import type { ReadingData, ZReadingRecord, YReadingRecord } from '../../data/readings.api';
import type {
  SalesAnalyticsOverview,
  InventoryItemAdmin,
  ProductAdmin,
} from '../../data/admin.api';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';
import type { VenueEvent } from '@/features/events/domain/event.types';
import type { SalesTrendsReport } from '../../domain/trends.types';
import { formatMoney, escapeXml, triggerDownload, EXCEL_STYLES } from './excelXmlCore';

export function exportSingleReadingToExcel(reading: ReadingData): void {
  const isZ = reading.reading_type === 'Z_READING';
  const isY = reading.reading_type === 'Y_READING';
  const title = isZ
    ? `SHIFT Z-READING #${reading.z_number || 1}`
    : isY
      ? `SHIFT HANDOVER Y-READING #${reading.y_number || 1}`
      : 'MID-SHIFT X-READING (INTERIM)';

  const drawerScopeLabel =
    reading.drawer_target === 'bar'
      ? 'Bar Station Till'
      : reading.drawer_target === 'main'
        ? 'Main Floor Till'
        : 'Consolidated Venue (All Tills)';

  const openedAtStr = new Date(reading.opened_at).toLocaleString();
  const closedAtStr = new Date(
    reading.generated_at || reading.closed_at || Date.now()
  ).toLocaleString();
  const managerName = reading.performed_by_name || reading.outgoing_staff_name || 'Manager';

  const varianceStyle =
    reading.variance === 0 || reading.variance === undefined
      ? 'VarianceBalanced'
      : 'VarianceDiscrepancy';

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Executive Report">
    <Table ss:DefaultColumnWidth="60" ss:DefaultRowHeight="20">
      <Column ss:Width="250"/>
      <Column ss:Width="160"/>
      <Column ss:Width="120"/>

      <!-- Header Banner -->
      <Row ss:Height="30">
        <Cell ss:MergeAcross="2" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">${escapeXml(title)} — OFFICIAL FISCAL AUDIT</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <!-- Metadata Section -->
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Drawer / Till Scope:</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(drawerScopeLabel)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Audit Period Start:</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(openedAtStr)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Generated / Closed At:</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(closedAtStr)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Accountable Staff / Manager:</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(managerName)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Invoice Reference Sequence:</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(reading.first_receipt_no || 'N/A')} to ${escapeXml(reading.last_receipt_no || 'N/A')}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Settled Transactions:</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String">${reading.transaction_count} tabs</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <!-- Section 1: Sales & Revenue -->
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="SectionHeader">
          <Data ss:Type="String">1. SALES &amp; REVENUE</Data>
        </Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Gross Revenue (Items Total)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.gross_sales}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Discounts, Voids &amp; Comps (-)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">-${reading.discount_total}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Net Sales Revenue (Consolidated)</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${reading.net_sales}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">  • Cafe Mode Net Sales</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.cafe_sales || 0}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${reading.cafe_tx_count || 0} tabs</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">  • Event Mode Net Sales</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.event_sales || 0}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${reading.event_tx_count || 0} tabs</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <!-- Section 2: Tax & Service Charges -->
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="SectionHeader">
          <Data ss:Type="String">2. TAX &amp; SERVICE CHARGE (BIR COMPLIANCE)</Data>
        </Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">VATable Sales (Net of VAT &amp; SC)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.vatable_sales}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">12% Value-Added Tax (VAT)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.vat_amount}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">10% House Service Charge</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.service_charge}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <!-- Section 3: Tender Methods -->
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="SectionHeader">
          <Data ss:Type="String">3. PAYMENT TENDER BREAKDOWN</Data>
        </Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Cash Payments</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.tender_cash}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Credit / Debit Card</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.tender_card}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Digital Wallets (GCash / Maya)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.tender_digital}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Online Delivery (GrabFood / Foodpanda)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.tender_delivery || 0}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Total Tender Collected</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${reading.total_tender}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <!-- Section 4: Cash Drawer Audit -->
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="SectionHeader">
          <Data ss:Type="String">4. CASH DRAWER RECONCILIATION</Data>
        </Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Opening Shift Float (+)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.opening_float}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Cash Sales Intake (+)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.tender_cash}</Data></Cell>
      </Row>
      ${
        reading.cash_in
          ? `
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Petty Cash In (+)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.cash_in}</Data></Cell>
      </Row>`
          : ''
      }
      ${
        reading.cash_out
          ? `
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Petty Cash Out (-)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">-${reading.cash_out}</Data></Cell>
      </Row>`
          : ''
      }
      ${
        reading.safe_drops
          ? `
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Safe Drops / Cash Pickups (-)</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">-${reading.safe_drops}</Data></Cell>
      </Row>`
          : ''
      }
      <Row>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">System Calculated Expected Cash</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${reading.expected_cash}</Data></Cell>
      </Row>
      ${
        reading.counted_cash !== undefined
          ? `
      <Row>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Physical Cash Counted in Drawer</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${reading.counted_cash}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Variance (Over / Short)</Data></Cell>
        <Cell ss:StyleID="${varianceStyle}"><Data ss:Type="Number">${reading.variance || 0}</Data></Cell>
      </Row>`
          : ''
      }

      <!-- Signature Section -->
      <Row ss:Height="24"/>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Audit Verification &amp; Sign-off:</Data></Cell>
      </Row>
      <Row ss:Height="30">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Cashier Signature: __________________________</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Manager Signature: __________________________</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `${reading.reading_type}_${reading.drawer_target}_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Export full multi-row historical archive of Z-Readings or Y-Handovers into Excel (.xls)
 */
