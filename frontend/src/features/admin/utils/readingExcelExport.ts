import { Platform } from 'react-native';
import type { ReadingData, ZReadingRecord, YReadingRecord } from '../data/readings.api';
import type { SalesAnalyticsOverview, InventoryItemAdmin, ProductAdmin } from '../data/admin.api';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';
import type { VenueEvent } from '@/features/events/domain/event.types';
import type { SalesTrendsReport } from '../domain/trends.types';

/**
 * Monk's Dream Jazz Bar POS - Company-Grade Excel Spreadsheet Generator
 * Generates executive, beautifully formatted SpreadsheetML (.xls) compatible with Microsoft Excel,
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
      <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#F5EBE6"/>
      <Interior ss:Color="#600018" ss:Pattern="Solid"/>
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
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#44403C"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#44403C"/>
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
    <Style ss:ID="DataLabelZebra">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#292524"/>
      <Interior ss:Color="#FAFAF9" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E7E5E4"/>
      </Borders>
    </Style>
    <Style ss:ID="DataCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1C1917"/>
      <NumberFormat ss:Format="₱#,##0.00;(₱#,##0.00);&quot;₱0.00&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F5F5F4"/>
      </Borders>
    </Style>
    <Style ss:ID="DataCurrencyZebra">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1C1917"/>
      <Interior ss:Color="#FAFAF9" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="₱#,##0.00;(₱#,##0.00);&quot;₱0.00&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E7E5E4"/>
      </Borders>
    </Style>
    <Style ss:ID="DataNumber">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1C1917"/>
      <NumberFormat ss:Format="#,##0.00"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F5F5F4"/>
      </Borders>
    </Style>
    <Style ss:ID="DataNumberZebra">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1C1917"/>
      <Interior ss:Color="#FAFAF9" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0.00"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E7E5E4"/>
      </Borders>
    </Style>
    <Style ss:ID="DataInteger">
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
    <Style ss:ID="SignatureBox">
      <Alignment ss:Horizontal="Left" ss:Vertical="Bottom"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#44403C"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#78716C"/>
      </Borders>
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

/**
 * Generates an executive Excel workbook for Online & Cashless Payment Transactions (GCash, Maya, QRPH, Card).
 */
export function exportCashlessRegisterToExcel(
  transactions: SettledCheckItem[],
  filterLabel: string = 'All Cashless Transactions'
): void {
  const totalAmount = transactions.reduce((acc, t) => acc + (t.total || 0), 0);

  const rows = transactions
    .map(
      (tx) => `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.referenceNumber ? `#${tx.referenceNumber}` : 'N/A')}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.paymentChannel || tx.paymentMethod)}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${tx.total}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.checkNumber)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.operatingMode || 'CAFE')}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${new Date(tx.settledAt).toLocaleDateString()}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${tx.timestamp}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.guestName)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.tableOrRef)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.cashierName)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(tx.notes || '-')}</Data></Cell>
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
  <Worksheet ss:Name="Cashless Payments">
    <Table ss:DefaultColumnWidth="90" ss:DefaultRowHeight="20">
      <Column ss:Width="110"/>
      <Column ss:Width="100"/>
      <Column ss:Width="110"/>
      <Column ss:Width="90"/>
      <Column ss:Width="70"/>
      <Column ss:Width="85"/>
      <Column ss:Width="70"/>
      <Column ss:Width="130"/>
      <Column ss:Width="110"/>
      <Column ss:Width="110"/>
      <Column ss:Width="150"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="10" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR — ONLINE &amp; CASHLESS RECONCILIATION LEDGER</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="10" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Scope: ${escapeXml(filterLabel)} • Exported: ${new Date().toLocaleString()} • ${transactions.length} Transactions • Total: PHP ${formatMoney(totalAmount)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Reference #</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Channel / Method</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Amount (PHP)</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Check #</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mode</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Time</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Customer / Tab</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Table / Location</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cashier / Server</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Payment Notes</Data></Cell>
      </Row>
      ${rows}
      <Row ss:Height="24">
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">TOTAL CASHLESS</Data></Cell>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">${transactions.length} Transactions</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totalAmount}</Data></Cell>
        <Cell ss:MergeAcross="7" ss:StyleID="TotalLabel"><Data ss:Type="String"></Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `CASHLESS_PAYMENTS_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Attendance & Payroll Ledger Excel Export
 */
export interface AttendanceExportItem {
  name: string;
  username: string;
  role: string;
  jobTitle?: string | null;
  isPosUser: boolean;
  status: string;
  clockIn?: string | null;
  clockOut?: string | null;
  hoursWorked: number;
  basePay: number;
  addonPay: number;
  totalPay: number;
  notes?: string | null;
}

export interface AttendanceExportTotals {
  presentCount: number;
  clockedInCount: number;
  completedCount: number;
  baseTotal: number;
  bonusTotal: number;
  grandTotal: number;
}

export function exportAttendancePayrollToExcel(params: {
  dateRangeLabel: string;
  isSingleDay: boolean;
  items: AttendanceExportItem[];
  totals: AttendanceExportTotals;
}): void {
  const { dateRangeLabel, isSingleDay, items, totals } = params;

  const rows = items
    .map((item, idx) => {
      const rowBg = idx % 2 === 0 ? '' : ' ss:StyleID="DataLabel"';
      const isExempt = item.status.includes('Exempt') || item.role.toLowerCase().includes('admin');
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">@${escapeXml(item.username)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.role)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${item.isPosUser ? 'POS User' : 'Support Staff'}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.status)}</Data></Cell>
        ${
          isSingleDay
            ? `
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${item.clockIn ? escapeXml(item.clockIn) : '—'}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${item.clockOut ? escapeXml(item.clockOut) : '—'}</Data></Cell>
        `
            : ''
        }
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${item.hoursWorked.toFixed(1)}</Data></Cell>
        ${
          isExempt
            ? `
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Exempt</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">—</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Exempt</Data></Cell>
        `
            : `
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${item.basePay}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${item.addonPay}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${item.totalPay}</Data></Cell>
        `
        }
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.notes || '—')}</Data></Cell>
      </Row>`;
    })
    .join('');

  const colCount = isSingleDay ? 12 : 10;

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Attendance &amp; Payroll">
    <Table>
      <Column ss:Width="160"/>
      <Column ss:Width="110"/>
      <Column ss:Width="130"/>
      <Column ss:Width="110"/>
      <Column ss:Width="120"/>
      ${isSingleDay ? '<Column ss:Width="90"/><Column ss:Width="90"/>' : ''}
      <Column ss:Width="80"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="110"/>
      <Column ss:Width="180"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — ATTENDANCE &amp; PAYROLL REPORT</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Period: ${escapeXml(dateRangeLabel)} • Generated on ${new Date().toLocaleString()} • Present Staff: ${totals.presentCount}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Staff Name</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Username</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Role / Job Title</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Type</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Shift Status</Data></Cell>
        ${
          isSingleDay
            ? `
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Clock In</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Clock Out</Data></Cell>
        `
            : ''
        }
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Hours</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Base Pay</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">OT / Bonus</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Pay</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Notes</Data></Cell>
      </Row>

      ${rows}

      <Row ss:Height="8"/>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="${isSingleDay ? 6 : 4}" ss:StyleID="TotalLabel">
          <Data ss:Type="String">TOTALS (Staff Present: ${totals.presentCount})</Data>
        </Cell>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">—</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totals.baseTotal}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totals.bonusTotal}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totals.grandTotal}</Data></Cell>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String"></Data></Cell>
      </Row>

      <!-- Executive Certification -->
      <Row ss:Height="24"/>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Executive Payroll Certification:</Data></Cell>
      </Row>
      <Row ss:Height="30">
        <Cell ss:MergeAcross="4" ss:StyleID="SignatureBox"><Data ss:Type="String">Prepared &amp; Audited by (HR / Finance): _____________________________</Data></Cell>
        <Cell ss:MergeAcross="${isSingleDay ? 5 : 3}" ss:StyleID="SignatureBox"><Data ss:Type="String">Certified Correct (General Manager): _____________________________</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const cleanDate = dateRangeLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `ATTENDANCE_PAYROLL_${cleanDate}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Company-Grade Inventory Valuation & Stocktake Excel Export
 */
export function exportInventoryValuationToExcel(
  items: InventoryItemAdmin[],
  categoryFilter: string = 'ALL'
): void {
  const filtered =
    categoryFilter === 'ALL' ? items : items.filter((i) => i.category === categoryFilter);

  let totalValue = 0;
  let reorderAlertCount = 0;

  const rows = filtered
    .map((item, idx) => {
      const isZebra = idx % 2 === 1;
      const labelStyle = isZebra ? 'DataLabelZebra' : 'DataLabel';
      const numStyle = isZebra ? 'DataNumberZebra' : 'DataNumber';
      const currStyle = isZebra ? 'DataCurrencyZebra' : 'DataCurrency';

      const lineTotal = (item.current_stock || 0) * (item.unit_cost || 0);
      totalValue += lineTotal;

      const isLowStock = item.current_stock <= item.min_alert_level;
      if (isLowStock) reorderAlertCount++;

      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.sku)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.category)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.supplier?.name || item.supplier_name || 'Direct')}</Data></Cell>
        <Cell ss:StyleID="${numStyle}"><Data ss:Type="Number">${item.current_stock}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.unit)}</Data></Cell>
        <Cell ss:StyleID="${numStyle}"><Data ss:Type="Number">${item.min_alert_level}</Data></Cell>
        <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${item.unit_cost}</Data></Cell>
        <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${lineTotal}</Data></Cell>
        <Cell ss:StyleID="${isLowStock ? 'VarianceDiscrepancy' : 'VarianceBalanced'}">
          <Data ss:Type="String">${isLowStock ? 'REORDER LOW' : 'OPTIMAL'}</Data>
        </Cell>
      </Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Inventory Valuation">
    <Table ss:DefaultColumnWidth="90" ss:DefaultRowHeight="20">
      <Column ss:Width="90"/>
      <Column ss:Width="190"/>
      <Column ss:Width="120"/>
      <Column ss:Width="150"/>
      <Column ss:Width="90"/>
      <Column ss:Width="65"/>
      <Column ss:Width="90"/>
      <Column ss:Width="105"/>
      <Column ss:Width="125"/>
      <Column ss:Width="110"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="9" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — INVENTORY VALUATION &amp; COSTING</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="9" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Category Scope: ${escapeXml(categoryFilter)} • Exported on ${new Date().toLocaleString()} • Total SKUs: ${filtered.length}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">SKU Code</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ingredient / Item Name</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Supplier / Vendor</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Current Stock</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">UOM</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Par Level</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Moving Avg Cost</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Valuation</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Stock Health</Data></Cell>
      </Row>

      ${rows}

      <Row ss:Height="8"/>
      <Row ss:Height="24">
        <Cell ss:MergeAcross="3" ss:StyleID="TotalLabel"><Data ss:Type="String">CONSOLIDATED INVENTORY VALUATION</Data></Cell>
        <Cell ss:MergeAcross="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Reorder Triggers: ${reorderAlertCount} item(s)</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totalValue}</Data></Cell>
        <Cell ss:StyleID="TotalLabel"><Data ss:Type="String"></Data></Cell>
      </Row>

      <!-- Signature Blocks -->
      <Row ss:Height="24"/>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Audit Verification &amp; Stocktake Sign-off:</Data></Cell>
      </Row>
      <Row ss:Height="30">
        <Cell ss:MergeAcross="4" ss:StyleID="SignatureBox"><Data ss:Type="String">Inventory Officer / Bar Manager: _____________________________</Data></Cell>
        <Cell ss:MergeAcross="4" ss:StyleID="SignatureBox"><Data ss:Type="String">Verified by General Manager: _____________________________</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `INVENTORY_VALUATION_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Company-Grade Menu Catalog & Recipe BOM Food Costing Excel Export
 */
export function exportMenuCatalogToExcel(products: ProductAdmin[]): void {
  let totalRevenuePotential = 0;
  let totalBOMCostPotential = 0;

  const rows = products
    .map((prod, idx) => {
      const isZebra = idx % 2 === 1;
      const labelStyle = isZebra ? 'DataLabelZebra' : 'DataLabel';
      const currStyle = isZebra ? 'DataCurrencyZebra' : 'DataCurrency';

      // Compute recipe BOM cost from ingredients
      let bomCost = 0;
      if (prod.ingredients && prod.ingredients.length > 0) {
        bomCost = prod.ingredients.reduce((acc, ing) => {
          const unitCost = ing.inventory_item?.unit_cost || 0;
          return acc + Number(ing.amount || 0) * unitCost;
        }, 0);
      } else if (prod.original_cost) {
        bomCost = Number(prod.original_cost);
      }

      const grossMargin =
        prod.base_price > 0 ? ((prod.base_price - bomCost) / prod.base_price) * 100 : 0;
      totalRevenuePotential += prod.base_price;
      totalBOMCostPotential += bomCost;

      const stationLabel =
        prod.station_target === 'bar'
          ? 'Bar Station'
          : prod.station_target === 'cafe'
            ? 'Cafe / Barista'
            : 'Kitchen Station';

      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(prod.name)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(prod.categories?.name || 'Unassigned')}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(stationLabel)}</Data></Cell>
        <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${prod.base_price}</Data></Cell>
        <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${bomCost.toFixed(2)}</Data></Cell>
        <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${(prod.base_price - bomCost).toFixed(2)}</Data></Cell>
        <Cell ss:StyleID="${grossMargin < 65 ? 'VarianceDiscrepancy' : 'VarianceBalanced'}">
          <Data ss:Type="String">${grossMargin.toFixed(1)}%</Data>
        </Cell>
        <Cell ss:StyleID="${labelStyle}">
          <Data ss:Type="String">${prod.ingredients?.length || 0} item(s)</Data>
        </Cell>
        <Cell ss:StyleID="${prod.auto_86 ? 'VarianceDiscrepancy' : 'VarianceBalanced'}">
          <Data ss:Type="String">${prod.auto_86 ? '86 (SOLD OUT)' : 'ACTIVE'}</Data>
        </Cell>
      </Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Recipe BOM &amp; Costing">
    <Table ss:DefaultColumnWidth="90" ss:DefaultRowHeight="20">
      <Column ss:Width="200"/>
      <Column ss:Width="130"/>
      <Column ss:Width="110"/>
      <Column ss:Width="105"/>
      <Column ss:Width="105"/>
      <Column ss:Width="105"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="110"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="8" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — MENU &amp; RECIPE BOM COSTING</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="8" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Official Recipe Engineering &amp; Profitability Audit • Exported on ${new Date().toLocaleString()} • Products: ${products.length}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Product Name</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Destination Station</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Menu Selling Price</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Recipe COGS (BOM)</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Gross Profit Yield</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Margin %</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">BOM Ingredients</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
      </Row>

      ${rows}

      <Row ss:Height="8"/>
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="TotalLabel"><Data ss:Type="String">CATALOG PORTFOLIO TOTALS</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totalRevenuePotential}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totalBOMCostPotential.toFixed(2)}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${(totalRevenuePotential - totalBOMCostPotential).toFixed(2)}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="TotalLabel">
          <Data ss:Type="String">Avg Margin: ${totalRevenuePotential > 0 ? (((totalRevenuePotential - totalBOMCostPotential) / totalRevenuePotential) * 100).toFixed(1) : 0}%</Data>
        </Cell>
      </Row>

      <!-- Signature Blocks -->
      <Row ss:Height="24"/>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Executive Sign-off:</Data></Cell>
      </Row>
      <Row ss:Height="30">
        <Cell ss:MergeAcross="3" ss:StyleID="SignatureBox"><Data ss:Type="String">Beverage Director / Head Chef: _____________________________</Data></Cell>
        <Cell ss:MergeAcross="4" ss:StyleID="SignatureBox"><Data ss:Type="String">Approved by General Manager: _____________________________</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `MENU_RECIPES_BOM_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Company-Grade Event Schedule & Production Run-of-Show Excel Export
 */
export function exportEventsScheduleToExcel(
  events: VenueEvent[],
  periodLabel: string = 'Current Month'
): void {
  const rows = events
    .map((ev, idx) => {
      const isZebra = idx % 2 === 1;
      const labelStyle = isZebra ? 'DataLabelZebra' : 'DataLabel';

      return `
      <Row ss:Height="22">
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.event_date)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.title)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.performer_name || 'House Band')}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.genre || 'Jazz')}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.sound_check_time || '—')}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.start_time)}${ev.end_time ? ' – ' + escapeXml(ev.end_time) : ''}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.reserved_tables || '—')}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(ev.gear_requirements || '—')}</Data></Cell>
        <Cell ss:StyleID="${ev.status === 'cancelled' ? 'VarianceDiscrepancy' : 'VarianceBalanced'}">
          <Data ss:Type="String">${escapeXml(ev.status.toUpperCase())}</Data>
        </Cell>
      </Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Event Logistics">
    <Table ss:DefaultColumnWidth="90" ss:DefaultRowHeight="20">
      <Column ss:Width="90"/>
      <Column ss:Width="190"/>
      <Column ss:Width="150"/>
      <Column ss:Width="110"/>
      <Column ss:Width="100"/>
      <Column ss:Width="120"/>
      <Column ss:Width="140"/>
      <Column ss:Width="180"/>
      <Column ss:Width="95"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="8" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — EVENT LOGISTICS &amp; RUN-OF-SHOW</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="8" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Period: ${escapeXml(periodLabel)} • Exported on ${new Date().toLocaleString()} • Gigs Scheduled: ${events.length}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Event Title</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Artist / Performer</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Genre</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Sound Check</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Showtime</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Reserved Tables</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Audio &amp; Backline</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
      </Row>

      ${rows}

      <Row ss:Height="24"/>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Stage Production Sign-off:</Data></Cell>
      </Row>
      <Row ss:Height="30">
        <Cell ss:MergeAcross="3" ss:StyleID="SignatureBox"><Data ss:Type="String">Stage Manager / Sound Engineer: _____________________________</Data></Cell>
        <Cell ss:MergeAcross="4" ss:StyleID="SignatureBox"><Data ss:Type="String">Approved by General Manager: _____________________________</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `EVENT_LOGISTICS_${cleanPeriod}.xls`;
  triggerDownload(xml, filename);
}

/**
 * Monk's Dream Jazz Bar POS - Sales & Product Trends Excel Workbook Generator
 * Multi-worksheet SpreadsheetML export covering:
 * 1. Executive Trend Accolades & Financial Summary
 * 2. Day of the Week Velocity (Mon-Sun)
 * 3. Daily & Weekly Timeline Pacing
 * 4. Full Ranked Best Sellers Register
 */
export function exportTrendsReportToExcel(trends: SalesTrendsReport, periodLabel: string): void {
  // Worksheet 2: Day of Week Rows
  const dayRows = trends.dayOfWeekTrends
    .map((day, idx) => {
      const isZebra = idx % 2 === 1;
      const labelStyle = isZebra ? 'DataLabelZebra' : 'DataLabel';
      const curStyle = isZebra ? 'DataCurrencyZebra' : 'DataCurrency';
      const intStyle = isZebra ? 'DataIntegerZebra' : 'DataInteger';
      const isWeekend = [5, 6, 0].includes(day.dayIndex);

      return `
      <Row ss:Height="22">
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(day.dayName)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${isWeekend ? 'Weekend Set' : 'Weekday'}</Data></Cell>
        <Cell ss:StyleID="${curStyle}"><Data ss:Type="Number">${day.totalSales}</Data></Cell>
        <Cell ss:StyleID="${intStyle}"><Data ss:Type="Number">${day.orderCount}</Data></Cell>
        <Cell ss:StyleID="${curStyle}"><Data ss:Type="Number">${day.averageSales}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${day.percentageOfWeeklyTotal}%</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${day.isBestDay ? '★ BEST DAY OF WEEK' : ''}</Data></Cell>
      </Row>`;
    })
    .join('');

  // Worksheet 3: Daily Timeline Rows
  const timelineRows = trends.dailyTimeline
    .map((d, idx) => {
      const isZebra = idx % 2 === 1;
      const labelStyle = isZebra ? 'DataLabelZebra' : 'DataLabel';
      const curStyle = isZebra ? 'DataCurrencyZebra' : 'DataCurrency';
      const intStyle = isZebra ? 'DataIntegerZebra' : 'DataInteger';

      return `
      <Row ss:Height="22">
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(d.label)}</Data></Cell>
        <Cell ss:StyleID="${curStyle}"><Data ss:Type="Number">${d.sales}</Data></Cell>
        <Cell ss:StyleID="${intStyle}"><Data ss:Type="Number">${d.orderCount}</Data></Cell>
        <Cell ss:StyleID="${curStyle}"><Data ss:Type="Number">${d.averageTicket}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${d.isPeak ? '★ PEAK SALES DATE' : ''}</Data></Cell>
      </Row>`;
    })
    .join('');

  // Worksheet 4: Best Sellers Ranked Rows
  const bestSellerRows = trends.bestSellers
    .map((item, idx) => {
      const isZebra = idx % 2 === 1;
      const labelStyle = isZebra ? 'DataLabelZebra' : 'DataLabel';
      const curStyle = isZebra ? 'DataCurrencyZebra' : 'DataCurrency';
      const intStyle = isZebra ? 'DataIntegerZebra' : 'DataInteger';

      return `
      <Row ss:Height="22">
        <Cell ss:StyleID="${intStyle}"><Data ss:Type="Number">${item.rank}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${escapeXml(item.category)}</Data></Cell>
        <Cell ss:StyleID="${curStyle}"><Data ss:Type="Number">${item.unitPrice}</Data></Cell>
        <Cell ss:StyleID="${intStyle}"><Data ss:Type="Number">${item.soldCount}</Data></Cell>
        <Cell ss:StyleID="${curStyle}"><Data ss:Type="Number">${item.salesAmount}</Data></Cell>
        <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${item.revenueSharePercent}%</Data></Cell>
      </Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  ${EXCEL_STYLES}
  <!-- SHEET 1: EXECUTIVE TRENDS & ACCOLADES -->
  <Worksheet ss:Name="Executive Trends">
    <Table ss:DefaultColumnWidth="110" ss:DefaultRowHeight="20">
      <Column ss:Width="160"/>
      <Column ss:Width="200"/>
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      <Column ss:Width="130"/>

      <Row ss:Height="30">
        <Cell ss:MergeAcross="4" ss:StyleID="TitleBanner">
          <Data ss:Type="String">MONK'S DREAM JAZZ BAR &amp; BISTRO — SALES &amp; PRODUCT TRENDS</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="4" ss:StyleID="SubtitleBanner">
          <Data ss:Type="String">Scope: ${escapeXml(periodLabel)} • Generated on ${new Date().toLocaleString()}</Data>
        </Cell>
      </Row>
      <Row ss:Height="12"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="4" ss:StyleID="SectionHeader"><Data ss:Type="String">1. EXECUTIVE TREND ACCOLADES &amp; PEAKS</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Best-Selling Day of Week:</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${trends.bestDayOfWeek ? `${escapeXml(trends.bestDayOfWeek.dayName)} (${trends.bestDayOfWeek.percentage}% of weekly sales)` : 'N/A'}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.bestDayOfWeek?.totalSales || 0}</Data></Cell>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Avg/Day:</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.bestDayOfWeek?.averageSales || 0}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Best-Selling Date (Peak):</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${trends.bestDate ? escapeXml(trends.bestDate.formattedDate) : 'N/A'}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.bestDate?.sales || 0}</Data></Cell>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Settled Checks:</Data></Cell>
        <Cell ss:StyleID="DataInteger"><Data ss:Type="Number">${trends.bestDate?.orderCount || 0}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Best-Selling Week:</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${trends.bestWeek ? escapeXml(trends.bestWeek.weekLabel) : 'N/A'}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.bestWeek?.sales || 0}</Data></Cell>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Settled Checks:</Data></Cell>
        <Cell ss:StyleID="DataInteger"><Data ss:Type="Number">${trends.bestWeek?.orderCount || 0}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Best-Selling Month:</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${trends.bestMonth ? escapeXml(trends.bestMonth.monthLabel) : 'N/A'}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.bestMonth?.sales || 0}</Data></Cell>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Settled Checks:</Data></Cell>
        <Cell ss:StyleID="DataInteger"><Data ss:Type="Number">${trends.bestMonth?.orderCount || 0}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Top Earning Menu Item:</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${trends.topSellingProduct ? `${escapeXml(trends.topSellingProduct.name)} [${escapeXml(trends.topSellingProduct.category)}]` : 'N/A'}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.topSellingProduct?.salesAmount || 0}</Data></Cell>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Volume Sold:</Data></Cell>
        <Cell ss:StyleID="DataInteger"><Data ss:Type="Number">${trends.topSellingProduct?.soldCount || 0}</Data></Cell>
      </Row>

      <Row ss:Height="14"/>
      <Row ss:Height="24">
        <Cell ss:MergeAcross="4" ss:StyleID="SectionHeader"><Data ss:Type="String">2. OVERALL FINANCIAL PERFORMANCE SUMMARY</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Total Gross Revenue:</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.totalGrossSales}</Data></Cell>
        <Cell ss:MergeAcross="2"/>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Total Settled Checks:</Data></Cell>
        <Cell ss:StyleID="DataInteger"><Data ss:Type="Number">${trends.totalOrders}</Data></Cell>
        <Cell ss:MergeAcross="2"/>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Average Ticket Size:</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${trends.averageTicket}</Data></Cell>
        <Cell ss:MergeAcross="2"/>
      </Row>

      <Row ss:Height="24"/>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Management Review &amp; Sign-off:</Data></Cell>
      </Row>
      <Row ss:Height="30">
        <Cell ss:MergeAcross="2" ss:StyleID="SignatureBox"><Data ss:Type="String">Prepared by Duty Manager: _____________________________</Data></Cell>
        <Cell ss:MergeAcross="1" ss:StyleID="SignatureBox"><Data ss:Type="String">Approved by General Manager: _____________________________</Data></Cell>
      </Row>
    </Table>
  </Worksheet>

  <!-- SHEET 2: DAY OF WEEK PACING -->
  <Worksheet ss:Name="Day of Week Trends">
    <Table ss:DefaultColumnWidth="110" ss:DefaultRowHeight="20">
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      <Column ss:Width="120"/>
      <Column ss:Width="90"/>
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      <Column ss:Width="160"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="6" ss:StyleID="TitleBanner"><Data ss:Type="String">DAY-OF-WEEK REVENUE PACING &amp; SET COMPARISON</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="6" ss:StyleID="SubtitleBanner"><Data ss:Type="String">Timeframe: ${escapeXml(periodLabel)}</Data></Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Day of Week</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Set Type</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Sales (₱)</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Checks</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Avg Daily Sales</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">% of Week</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Peak Status</Data></Cell>
      </Row>

      ${dayRows}
    </Table>
  </Worksheet>

  <!-- SHEET 3: DAILY TIMELINE -->
  <Worksheet ss:Name="Daily Timeline">
    <Table ss:DefaultColumnWidth="110" ss:DefaultRowHeight="20">
      <Column ss:Width="150"/>
      <Column ss:Width="130"/>
      <Column ss:Width="100"/>
      <Column ss:Width="130"/>
      <Column ss:Width="160"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="4" ss:StyleID="TitleBanner"><Data ss:Type="String">CHRONOLOGICAL DAILY SALES TIMELINE</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="4" ss:StyleID="SubtitleBanner"><Data ss:Type="String">Timeframe: ${escapeXml(periodLabel)}</Data></Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Gross Sales (₱)</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Checks Settled</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Average Ticket</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Peak Status</Data></Cell>
      </Row>

      ${timelineRows}
    </Table>
  </Worksheet>

  <!-- SHEET 4: BEST SELLERS REGISTER -->
  <Worksheet ss:Name="Best Sellers Register">
    <Table ss:DefaultColumnWidth="110" ss:DefaultRowHeight="20">
      <Column ss:Width="60"/>
      <Column ss:Width="200"/>
      <Column ss:Width="140"/>
      <Column ss:Width="100"/>
      <Column ss:Width="90"/>
      <Column ss:Width="130"/>
      <Column ss:Width="100"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="6" ss:StyleID="TitleBanner"><Data ss:Type="String">MENU BEST SELLERS &amp; PRODUCT DEMAND REGISTER</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="6" ss:StyleID="SubtitleBanner"><Data ss:Type="String">Ranked by Gross Earnings • Timeframe: ${escapeXml(periodLabel)}</Data></Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Rank</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Menu Item Name</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Unit Price (₱)</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Units Sold</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Sales (₱)</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Sales Share</Data></Cell>
      </Row>

      ${bestSellerRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `SALES_TRENDS_REPORT_${cleanPeriod}.xls`;
  triggerDownload(xml, filename);
}
