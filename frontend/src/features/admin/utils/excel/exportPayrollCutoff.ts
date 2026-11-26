import { escapeXml, triggerDownload, EXCEL_STYLES } from './excelXmlCore';
import type {
  PayrollRunItem,
  PayrollRunSummary,
} from '../../presentation/views/payroll/payroll.types';

export function exportPayrollCutoffToExcel(params: {
  run: PayrollRunSummary;
  items: PayrollRunItem[];
}): void {
  const { run, items } = params;

  const rows = items
    .map((item) => {
      const additions =
        Number(item.cutoff_bonus || 0) +
        Number(item.service_charge_share || 0) +
        Number(item.other_additions || 0);
      const deductions =
        Number(item.cash_advance_deduction || 0) +
        Number(item.sss_deduction || 0) +
        Number(item.philhealth_deduction || 0) +
        Number(item.pagibig_deduction || 0) +
        Number(item.tax_deduction || 0) +
        Number(item.other_deductions || 0);

      if (item.is_payroll_exempt) {
        return `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.employee_name)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.job_title || item.employee_role)}</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${item.shifts_worked}</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${Number(item.hours_worked || 0).toFixed(1)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Exempt</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Exempt</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Exempt</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">Exempt</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">EXEMPT</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">—</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">—</Data></Cell>
      </Row>`;
      }

      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.employee_name)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.job_title || item.employee_role)}</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${item.shifts_worked}</Data></Cell>
        <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${Number(item.hours_worked || 0).toFixed(1)}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${Number(item.gross_pay || 0)}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${additions}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${deductions}</Data></Cell>
        <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${Number(item.net_pay || 0)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.payout_status)}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.payment_method || '—')}</Data></Cell>
        <Cell ss:StyleID="DataLabel"><Data ss:Type="String">${escapeXml(item.payment_reference || '—')}</Data></Cell>
      </Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Payroll Cutoff">
    <Table>
      <Column ss:Width="150"/><Column ss:Width="110"/><Column ss:Width="65"/><Column ss:Width="65"/>
      <Column ss:Width="95"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="100"/>
      <Column ss:Width="95"/><Column ss:Width="95"/><Column ss:Width="100"/>
      <Row ss:Height="26">
        <Cell ss:MergeAcross="10" ss:StyleID="Title"><Data ss:Type="String">MONK'S DREAM JAZZ BAR · PAYROLL CUTOFF REGISTER (${escapeXml(run.run_code)})</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="10" ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(run.title)} · ${run.period_start} to ${run.period_end} · Status: ${run.status}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="Header"><Data ss:Type="String">Employee</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Role</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Shifts</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Hours</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Gross Pay</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Additions</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Deductions</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Net Pay</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Method</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Reference</Data></Cell>
      </Row>
      ${rows}
      <Row ss:Height="22">
        <Cell ss:MergeAcross="3" ss:StyleID="TotalLabel"><Data ss:Type="String">TOTAL PAYROLL</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${Number(run.gross_pay_total || 0)}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${Number(run.additions_total || 0)}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${Number(run.deductions_total || 0)}</Data></Cell>
        <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${Number(run.net_pay_total || 0)}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="TotalLabel"><Data ss:Type="String">Paid: ₱${Number(run.paid_amount_total || 0).toFixed(2)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  triggerDownload(`PAYROLL_${run.run_code}.xls`, xml);
}
