import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  readingsApi,
  type ReadingData,
  type ZReadingRecord,
  type YReadingRecord,
  type ShiftVariancePoint,
} from '../../../data/readings.api';
import {
  exportSingleReadingToExcel,
  exportReadingsArchiveToExcel,
} from '../../../utils/readingExcelExport';

export const useAdminReadingsController = () => {
  const [drawerScope, setDrawerScope] = useState<'consolidated' | 'main' | 'bar'>('consolidated');
  const [activeReading, setActiveReading] = useState<ReadingData | null>(null);
  const [zHistory, setZHistory] = useState<ZReadingRecord[]>([]);
  const [yHistory, setYHistory] = useState<YReadingRecord[]>([]);
  const [varianceTrend, setVarianceTrend] = useState<ShiftVariancePoint[]>([]);
  const [historyTab, setHistoryTab] = useState<'z_readings' | 'y_handovers'>('z_readings');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDrawer, setArchiveDrawer] = useState<'all' | 'consolidated' | 'main' | 'bar'>(
    'all'
  );

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReadingData | null>(null);
  const [zCloseModalVisible, setZCloseModalVisible] = useState(false);
  const [yCloseModalVisible, setYCloseModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reading, zList, yList, variancePoints] = await Promise.all([
        readingsApi.fetchCurrentXReading(drawerScope),
        readingsApi.fetchZReadingHistory(),
        readingsApi.fetchYReadingHistory(),
        readingsApi.fetchShiftVarianceHistory(),
      ]);
      setActiveReading(reading);
      setZHistory(zList);
      setYHistory(yList);
      setVarianceTrend(variancePoints);
    } catch (err: any) {
      console.error('[AdminReadingsView] Error loading readings data:', err);
      toast.error('Failed to load readings data from database', { title: 'Fetch Error' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [drawerScope]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleOpenXReading = () => {
    if (!activeReading) return;
    setSelectedReport(activeReading);
    setReportModalVisible(true);
  };

  const handleOpenYClose = async () => {
    try {
      const shiftReading = await readingsApi.fetchCurrentXReading(drawerScope, 'shift');
      setActiveReading(shiftReading);
    } catch (err) {
      console.warn('[AdminReadingsView] Could not pre-fetch shift reading:', err);
    }
    setYCloseModalVisible(true);
  };

  const handleOpenZClose = () => {
    if (!activeReading) return;
    setZCloseModalVisible(true);
  };

  const handleZSuccess = (zRecord: ZReadingRecord) => {
    loadData();
    const readingData: ReadingData = {
      reading_type: 'Z_READING',
      z_number: zRecord.z_number,
      drawer_target: zRecord.drawer_target,
      opened_at: zRecord.opened_at,
      closed_at: zRecord.closed_at,
      performed_by_name: zRecord.performed_by_name,
      gross_sales: zRecord.gross_sales,
      discount_total: zRecord.discount_total,
      net_sales: zRecord.net_sales,
      vatable_sales: zRecord.vatable_sales,
      vat_amount: zRecord.vat_amount,
      vat_exempt_sales: zRecord.vat_exempt_sales,
      service_charge: zRecord.service_charge,
      tender_cash: zRecord.tender_cash,
      tender_card: zRecord.tender_card,
      tender_digital: zRecord.tender_digital,
      tender_delivery: zRecord.tender_delivery,
      total_tender: zRecord.total_tender,
      opening_float: zRecord.opening_float,
      cash_in: zRecord.cash_in,
      cash_out: zRecord.cash_out,
      safe_drops: zRecord.safe_drops,
      expected_cash: zRecord.expected_cash,
      counted_cash: zRecord.counted_cash,
      variance: zRecord.variance,
      transaction_count: zRecord.transaction_count,
      first_receipt_no: zRecord.first_receipt_no || 'N/A',
      last_receipt_no: zRecord.last_receipt_no || 'N/A',
      notes: zRecord.notes || undefined,
    };
    setSelectedReport(readingData);
    setReportModalVisible(true);
  };

  const handleYSuccess = (yRecord: YReadingRecord) => {
    loadData();
    const readingData: ReadingData = {
      reading_type: 'Y_READING',
      y_number: yRecord.y_number,
      drawer_target: yRecord.drawer_target,
      opened_at: yRecord.opened_at,
      closed_at: yRecord.closed_at,
      outgoing_staff_name: yRecord.outgoing_staff_name,
      incoming_staff_name: yRecord.incoming_staff_name,
      performed_by_name: yRecord.outgoing_staff_name,
      gross_sales: yRecord.gross_sales,
      discount_total: yRecord.discount_total,
      net_sales: yRecord.net_sales,
      vatable_sales: yRecord.vatable_sales,
      vat_amount: yRecord.vat_amount,
      vat_exempt_sales: 0,
      service_charge: yRecord.service_charge,
      tender_cash: yRecord.tender_cash,
      tender_card: yRecord.tender_card,
      tender_digital: yRecord.tender_digital,
      tender_delivery: yRecord.tender_delivery,
      total_tender: yRecord.total_tender,
      opening_float: yRecord.opening_float,
      cash_in: yRecord.cash_in,
      cash_out: yRecord.cash_out,
      safe_drops: yRecord.safe_drops,
      expected_cash: yRecord.expected_cash,
      counted_cash: yRecord.counted_cash,
      variance: yRecord.variance,
      transaction_count: yRecord.transaction_count,
      first_receipt_no: yRecord.first_receipt_no || 'N/A',
      last_receipt_no: yRecord.last_receipt_no || 'N/A',
      notes: yRecord.notes || undefined,
    };
    setSelectedReport(readingData);
    setReportModalVisible(true);
  };

  const handleExportExcel = () => {
    if (!activeReading) return;
    try {
      exportSingleReadingToExcel(activeReading);
      toast.success('Reading exported to Excel (.xls)', { title: 'Export Ready' });
    } catch (err: any) {
      console.error('[AdminReadingsView] Excel export error:', err);
      toast.error('Failed to export reading to Excel', { title: 'Export Error' });
    }
  };

  const filteredZHistory = useMemo(() => {
    return zHistory.filter((rec) => {
      if (archiveDrawer !== 'all' && rec.drawer_target !== archiveDrawer) return false;
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase().trim();
        const matchNum =
          `z-${rec.z_number}`.toLowerCase().includes(q) || String(rec.z_number).includes(q);
        const matchStaff = (rec.performed_by_name || '').toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        const matchDate = new Date(rec.closed_at).toLocaleDateString().includes(q);
        return matchNum || matchStaff || matchNotes || matchDate;
      }
      return true;
    });
  }, [zHistory, archiveDrawer, archiveSearch]);

  const filteredYHistory = useMemo(() => {
    return yHistory.filter((rec) => {
      if (archiveDrawer !== 'all' && rec.drawer_target !== archiveDrawer) return false;
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase().trim();
        const matchNum =
          `y-${rec.y_number}`.toLowerCase().includes(q) || String(rec.y_number).includes(q);
        const matchOut = (rec.outgoing_staff_name || '').toLowerCase().includes(q);
        const matchIn = (rec.incoming_staff_name || '').toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        const matchDate = new Date(rec.closed_at).toLocaleDateString().includes(q);
        return matchNum || matchOut || matchIn || matchNotes || matchDate;
      }
      return true;
    });
  }, [yHistory, archiveDrawer, archiveSearch]);

  const handleExportArchive = () => {
    try {
      if (historyTab === 'z_readings') {
        exportReadingsArchiveToExcel('Z_READING', filteredZHistory);
        toast.success(`Exported ${filteredZHistory.length} Z-Readings to Excel`, {
          title: 'Archive Exported',
        });
      } else {
        exportReadingsArchiveToExcel('Y_READING', filteredYHistory);
        toast.success(`Exported ${filteredYHistory.length} Y-Handovers to Excel`, {
          title: 'Archive Exported',
        });
      }
    } catch (err: any) {
      console.error('[AdminReadingsView] Archive export error:', err);
      toast.error('Failed to export archive to Excel', { title: 'Export Error' });
    }
  };

  return {
    drawerScope,
    setDrawerScope,
    activeReading,
    varianceTrend,
    historyTab,
    setHistoryTab,
    isLoading,
    isRefreshing,
    archiveSearch,
    setArchiveSearch,
    archiveDrawer,
    setArchiveDrawer,
    reportModalVisible,
    setReportModalVisible,
    selectedReport,
    setSelectedReport,
    zCloseModalVisible,
    setZCloseModalVisible,
    yCloseModalVisible,
    setYCloseModalVisible,
    handleRefresh,
    handleOpenXReading,
    handleOpenYClose,
    handleOpenZClose,
    handleZSuccess,
    handleYSuccess,
    handleExportExcel,
    filteredZHistory,
    filteredYHistory,
    handleExportArchive,
  };
};
