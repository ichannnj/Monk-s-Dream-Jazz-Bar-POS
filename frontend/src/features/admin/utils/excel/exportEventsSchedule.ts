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
