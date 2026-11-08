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

export function exportReadingsArchiveToExcel(
  type: 'Z_READING' | 'Y_READING',
  records: Array<ZReadingRecord | YReadingRecord>
): void {
  const isZ = type === 'Z_READING';
  const title = isZ
    ? 'HISTORICAL DAILY Z-READINGS ARCHIVE'
    : 'HISTORICAL SHIFT HANDOVER (Y-REPORTS) ARCHIVE';

  const rows = records
    .map(
      (r: any) => `
    <Row>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="String">#${isZ ? r.z_number : r.y_number}</Data></Cell>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(new Date(r.closed_at).toLocaleDateString())}</Data></Cell>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(new Date(r.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</Data></Cell>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(r.drawer_target)}</Data></Cell>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(r.performed_by_name || r.outgoing_staff_name || 'Staff')}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.gross_sales}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.discount_total}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.net_sales}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.cafe_sales ?? r.cafe_net_sales ?? 0}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.event_sales ?? r.event_net_sales ?? 0}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.vatable_sales}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.vat_amount}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.service_charge}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.tender_cash}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.tender_card}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.tender_digital}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.expected_cash}</Data></Cell>
      <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${r.counted_cash}</Data></Cell>
      <Cell ss:StyleID="${r.variance === 0 ? 'VarianceBalanced' : 'VarianceDiscrepancy'}"><Data ss:Type="Number">${r.variance}</Data></Cell>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="Number">${r.transaction_count}</Data></Cell>
      <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(r.notes || '')}</Data></Cell>
    </Row>
  `
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Readings Archive">
    <Table ss:DefaultColumnWidth="80" ss:DefaultRowHeight="20">
      <Column ss:Width="60"/>
      <Column ss:Width="90"/>
      <Column ss:Width="70"/>
      <Column ss:Width="90"/>
      <Column ss:Width="130"/>
      <Column ss:Width="100"/>
      <Column ss:Width="90"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="90"/>
      <Column ss:Width="90"/>
      <Column ss:Width="90"/>
      <Column ss:Width="90"/>
      <Column ss:Width="90"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="90"/>
      <Column ss:Width="60"/>
      <Column ss:Width="160"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="20" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — ${title}</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="20" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Exported on ${new Date().toLocaleString()} • Official POS Fiscal Audit Trail</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Reading #</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Time</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Drawer</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Performed By</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Gross Sales</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Discounts</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Net Sales</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cafe Sales</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Event Sales</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">VATable</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">12% VAT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">10% SC</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cash</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Card</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Digital</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Expected</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Counted</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Variance</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tabs</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Notes</Data></Cell>
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `${type}_ARCHIVE_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Generates an executive Excel workbook for the Financial Overview.
 */
