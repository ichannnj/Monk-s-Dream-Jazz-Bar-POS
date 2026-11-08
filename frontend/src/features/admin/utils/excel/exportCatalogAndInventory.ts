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
