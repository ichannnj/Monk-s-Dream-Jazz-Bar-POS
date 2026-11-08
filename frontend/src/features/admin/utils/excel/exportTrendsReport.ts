import type { SalesTrendsReport } from '../../domain/trends.types';
import { formatMoney, escapeXml, triggerDownload, EXCEL_STYLES } from './excelXmlCore';

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
