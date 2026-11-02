import { Platform } from 'react-native';
import type { ReadingData, ZReadingRecord, YReadingRecord } from '../data/readings.api';
import type { SalesAnalyticsOverview } from '../data/admin.api';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';

/**
 * Monk's Dream Jazz Bar POS - Professional Excel Spreadsheet Generator
 * Generates beautifully formatted SpreadsheetML (.xls) compatible with Microsoft Excel,
 * Apple Numbers, LibreOffice Calc, and Google Sheets with brand colors and styling.
 */

function formatMoney(amount: number = 0): string {
  return Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerDownload(content: string, filename: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const EXCEL_STYLES = `
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1C1917"/>
    </Style>
    <Style ss:ID="TitleBanner">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4A1020"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#800020" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SubtitleBanner">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#E7E5E4"/>
      <Interior ss:Color="#800020" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SectionHeader">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#800020"/>
      <Interior ss:Color="#F5F5F4" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6D3D1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6D3D1"/>
      </Borders>
    </Style>
    <Style ss:ID="TableHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#292524" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
    </Style>
    <Style ss:ID="MetaLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#57534E"/>
    </Style>
    <Style ss:ID="MetaValue">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1C1917"/>
    </Style>
    <Style ss:ID="DataLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#292524"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F5F5F4"/>
      </Borders>
    </Style>
    <Style ss:ID="DataCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1C1917"/>
      <NumberFormat ss:Format="₱#,##0.00;(₱#,##0.00);&quot;₱0.00&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F5F5F4"/>
      </Borders>
    <Style ss:ID="DataNumber">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1C1917"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F5F5F4"/>
      </Borders>
    </Style>
    <Style ss:ID="TotalLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1C1917"/>
      <Interior ss:Color="#FAFAF9" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A8A29E"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#78716C"/>
      </Borders>
    </Style>
    <Style ss:ID="TotalCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#800020"/>
      <Interior ss:Color="#FAFAF9" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="₱#,##0.00;(₱#,##0.00);&quot;₱0.00&quot;"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A8A29E"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#78716C"/>
      </Borders>
    </Style>
    <Style ss:ID="VarianceBalanced">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
      <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="₱#,##0.00"/>
    </Style>
    <Style ss:ID="VarianceDiscrepancy">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#B91C1C"/>
      <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="₱#,##0.00"/>
    </Style>
  </Styles>
`;

/**
 * Export single official X, Y, or Z reading as a beautifully formatted Excel workbook (.xls)
 */
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
export function exportFinancialOverviewToExcel(
  analytics: SalesAnalyticsOverview,
  filterLabel: string = 'Current Filter'
): void {
  const channelEntries = Object.entries(analytics.channelBreakdown || {});
  const gross = Number(analytics.grossSales || 0);
  const count = Number(analytics.orderCount || 0);
  const avg = Number(analytics.averageTicket || 0);
  const cogs = Number(analytics.totalCogs || 0);
  const labor = Number(analytics.totalLaborExpense || 0);
  const net = Number(analytics.estimatedNetProfit || 0);

  const channelRows = channelEntries
    .map(
      ([channel, data]) => `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(channel.replace(/_/g, ' '))}</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${data.count}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${data.sales}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${gross > 0 ? Math.round((data.sales / gross) * 100) : 0}%</Data></Cell>
      </Row>`
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Financial Overview">
    <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="20">
      <Column ss:Width="200"/>
      <Column ss:Width="100"/>
      <Column ss:Width="130"/>
      <Column ss:Width="100"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="3" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — EXECUTIVE SALES REPORT</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="3" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Filter Scope: ${escapeXml(filterLabel)} • Generated on ${new Date().toLocaleString()}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="22">
        <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">1. TOP EXECUTIVE REVENUE SUMMARY</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Gross Sales Revenue</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="DataCurrency"><Data ss:Type="Number">${gross}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Settled Customer Tabs</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="DataNumber"><Data ss:Type="Number">${count}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Average Ticket Size</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="DataCurrency"><Data ss:Type="Number">${avg}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Cost of Goods Sold (COGS)</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="DataCurrency"><Data ss:Type="Number">${cogs}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Labor &amp; Staff Expense</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="DataCurrency"><Data ss:Type="Number">${labor}</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Estimated Net Yield</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="TotalCurrency"><Data ss:Type="Number">${net}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <!-- Section 2: Operating Mode Split -->
      <Row ss:Height="22">
        <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">2. OPERATING MODE REVENUE SPLIT</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Operating Mode</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Settled Tabs</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Net Revenue</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Revenue Share</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">☀️ Cafe Mode</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${analytics.modeBreakdown?.cafeOrderCount || 0}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${analytics.modeBreakdown?.cafeSales || 0}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${analytics.modeBreakdown?.cafePercent || 0}%</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">🎷 Event Mode</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${analytics.modeBreakdown?.eventOrderCount || 0}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${analytics.modeBreakdown?.eventSales || 0}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${analytics.modeBreakdown?.eventPercent || 0}%</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Consolidated Total</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${count}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${analytics.modeBreakdown?.totalSales || gross}</Data></Cell>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">100%</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <Row ss:Height="22">
        <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">3. CHANNEL &amp; FULFILLMENT BREAKDOWN</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Operational Channel</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Order Count</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Gross Revenue</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Yield Share</Data></Cell>
      </Row>
      ${channelRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `FINANCIAL_OVERVIEW_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Generates an executive Excel workbook for the Settled Checks Register.
 */
export function exportChecksRegisterToExcel(
  checks: SettledCheckItem[],
  filterLabel: string = 'All Checks'
): void {
  const rows = checks
    .map(
      (chk) => `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.checkNumber)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.operatingMode || 'CAFE')}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${new Date(chk.settledAt).toLocaleDateString()}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${chk.timestamp}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.orderType.toUpperCase())}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.tableOrRef)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.guestName)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.cashierName)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(chk.paymentMethod)}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${chk.subtotal}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${chk.discountAmount}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${chk.vatableSales}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${chk.vatAmount}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${chk.serviceCharge}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${chk.total}</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${chk.itemsCount}</Data></Cell>
      </Row>`
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Checks Register">
    <Table ss:DefaultColumnWidth="90" ss:DefaultRowHeight="20">
      <Column ss:Width="80"/>
      <Column ss:Width="70"/>
      <Column ss:Width="85"/>
      <Column ss:Width="70"/>
      <Column ss:Width="90"/>
      <Column ss:Width="110"/>
      <Column ss:Width="130"/>
      <Column ss:Width="110"/>
      <Column ss:Width="90"/>
      <Column ss:Width="95"/>
      <Column ss:Width="85"/>
      <Column ss:Width="90"/>
      <Column ss:Width="85"/>
      <Column ss:Width="85"/>
      <Column ss:Width="105"/>
      <Column ss:Width="65"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="15" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — SETTLED CHECKS REGISTER</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="15" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Scope: ${escapeXml(filterLabel)} • Exported on ${new Date().toLocaleString()} • ${checks.length} Records</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Check #</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mode</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Time</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Channel</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Table / Ref</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Guest</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cashier</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tender</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Subtotal</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Discount</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">VATable</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">12% VAT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">10% SC</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Grand Total</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Items</Data></Cell>
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `CHECKS_REGISTER_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}
