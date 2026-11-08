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
