/**
 * Reading Excel Export Facade
 *
 * Provides company-grade SpreadsheetML (.xls) workbook generators.
 * Callers can use direct exports or lazy dynamic imports to ensure
 * zero spreadsheet parsing overhead on floor POS tablets.
 */

export * from './excel/excelXmlCore';
export * from './excel/exportSingleReading';
export * from './excel/exportReadingsArchive';
export * from './excel/exportFinancialAndChecks';
export * from './excel/exportAttendancePayroll';
export * from './excel/exportCatalogAndInventory';
export * from './excel/exportEventsSchedule';
export * from './excel/exportTrendsReport';

/**
 * Lazy Dynamic Exporters
 * Clean entrypoints for code-split floor and admin components.
 */
export async function lazyExportChecksRegister(
  ...args: Parameters<typeof import('./excel/exportFinancialAndChecks').exportChecksRegisterToExcel>
): Promise<void> {
  const { exportChecksRegisterToExcel } = await import('./excel/exportFinancialAndChecks');
  return exportChecksRegisterToExcel(...args);
}

export async function lazyExportTrendsReport(
  ...args: Parameters<typeof import('./excel/exportTrendsReport').exportTrendsReportToExcel>
): Promise<void> {
  const { exportTrendsReportToExcel } = await import('./excel/exportTrendsReport');
  return exportTrendsReportToExcel(...args);
}

export async function lazyExportEventsSchedule(
  ...args: Parameters<typeof import('./excel/exportEventsSchedule').exportEventsScheduleToExcel>
): Promise<void> {
  const { exportEventsScheduleToExcel } = await import('./excel/exportEventsSchedule');
  return exportEventsScheduleToExcel(...args);
}
