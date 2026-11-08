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
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Event Mode</Data></Cell>
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
