import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePrinterStationStore } from '../usePrinterStationStore';
import { useDeviceHardwareStation } from '../useDeviceHardwareStation';
import { webSerialPrinter } from '../../services/webSerialPrinter';
import { printerApi } from '../../data/printer.api';

describe('usePrinterStationStore - Hardware Watchdog & Auto-Connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePrinterStationStore.setState({
      connectionStatus: 'DISCONNECTED',
      isLeader: true,
      autoPrintEnabled: true,
      recentJobs: [],
    });
  });

  it('ensureConnected detects physically open driver and flips store status to CONNECTED', async () => {
    vi.spyOn(webSerialPrinter, 'isConnected').mockReturnValue(true);
    vi.spyOn(webSerialPrinter, 'getPortInfo').mockReturnValue({
      deviceName: 'Thermal 58mm',
      type: 'usb',
    });
    vi.spyOn(webSerialPrinter, 'getBoundPrinter').mockReturnValue({
      vendorId: 0x0483,
      productId: 0x5743,
      transport: 'usb',
    });

    const connected = await usePrinterStationStore.getState().ensureConnected();
    expect(connected).toBe(true);
    expect(usePrinterStationStore.getState().connectionStatus).toBe('CONNECTED');
    expect(usePrinterStationStore.getState().portInfo?.deviceName).toBe('Thermal 58mm');
  });

  it('ensureConnected automatically triggers autoConnect when disconnected', async () => {
    vi.spyOn(webSerialPrinter, 'isConnected').mockReturnValue(false);
    const autoConnectSpy = vi.spyOn(webSerialPrinter, 'autoConnect').mockResolvedValue(true);
    vi.spyOn(webSerialPrinter, 'getPortInfo').mockReturnValue({
      deviceName: 'USB Thermal POS',
      type: 'usb',
    });
    vi.spyOn(webSerialPrinter, 'getBoundPrinter').mockReturnValue(null);

    const connected = await usePrinterStationStore.getState().ensureConnected();
    expect(connected).toBe(true);
    expect(autoConnectSpy).toHaveBeenCalled();
    expect(usePrinterStationStore.getState().connectionStatus).toBe('CONNECTED');
  });

  it('drainPendingJobsQueue auto-connects to plugged-in printer and prints the most recent chit', async () => {
    vi.spyOn(webSerialPrinter, 'isConnected').mockReturnValue(false);
    vi.spyOn(webSerialPrinter, 'autoConnect').mockResolvedValue(true);
    vi.spyOn(webSerialPrinter, 'getPortInfo').mockReturnValue({
      deviceName: 'Thermal',
      type: 'usb',
    });
    vi.spyOn(webSerialPrinter, 'getBoundPrinter').mockReturnValue(null);
    vi.spyOn(webSerialPrinter, 'writeBytes').mockResolvedValue(true);

    const pendingJobs = [
      {
        id: 'job-1',
        job_type: 'RUNNER_CHIT',
        receipt_data: {},
        status: 'PENDING' as const,
        created_at: '2026-11-17T10:00:00Z',
        printed_at: null,
      },
      {
        id: 'job-2',
        job_type: 'RUNNER_CHIT',
        receipt_data: {},
        status: 'PENDING' as const,
        created_at: '2026-11-17T10:01:00Z',
        printed_at: null,
      },
      {
        id: 'job-3',
        job_type: 'RUNNER_CHIT',
        receipt_data: {},
        status: 'PENDING' as const,
        created_at: '2026-11-17T10:02:00Z',
        printed_at: null,
      },
    ];

    vi.spyOn(printerApi, 'getPendingPrintJobs').mockResolvedValue(pendingJobs);
    const dismissSpy = vi.spyOn(printerApi, 'dismissStalePendingJobs').mockResolvedValue();
    const claimSpy = vi.spyOn(printerApi, 'claimJob').mockResolvedValue(true);
    const markCompletedSpy = vi.spyOn(printerApi, 'markJobCompleted').mockResolvedValue();

    await usePrinterStationStore.getState().drainPendingJobsQueue();

    // Stale jobs 1 and 2 must be dismissed
    expect(dismissSpy).toHaveBeenCalledWith(['job-1', 'job-2']);
    // Only the most recent job 3 must be claimed and printed
    expect(claimSpy).toHaveBeenCalledWith('job-3');
    expect(markCompletedSpy).toHaveBeenCalledWith('job-3');
  });

  it('drainPendingJobsQueue never dismisses CUSTOMER_RECEIPT or DRAWER_KICK jobs when RUNNER_CHIT backlog exists', async () => {
    vi.spyOn(webSerialPrinter, 'isConnected').mockReturnValue(true);
    vi.spyOn(webSerialPrinter, 'writeBytes').mockResolvedValue(true);

    const pendingJobs = [
      {
        id: 'chit-old',
        job_type: 'RUNNER_CHIT',
        receipt_data: {},
        status: 'PENDING' as const,
        created_at: '2026-11-21T10:00:00Z',
        printed_at: null,
      },
      {
        id: 'rcpt-1',
        job_type: 'CUSTOMER_RECEIPT',
        receipt_data: { receiptNumber: 'MD-1001', total: 550, subtotal: 550, items: [] },
        status: 'PENDING' as const,
        created_at: '2026-11-21T10:00:30Z',
        printed_at: null,
      },
      {
        id: 'kick-1',
        job_type: 'DRAWER_KICK',
        receipt_data: {},
        status: 'PENDING' as const,
        created_at: '2026-11-21T10:00:40Z',
        printed_at: null,
      },
      {
        id: 'chit-new',
        job_type: 'RUNNER_CHIT',
        receipt_data: {},
        status: 'PENDING' as const,
        created_at: '2026-11-21T10:01:00Z',
        printed_at: null,
      },
    ];

    vi.spyOn(printerApi, 'getPendingPrintJobs').mockResolvedValue(pendingJobs);
    const dismissSpy = vi.spyOn(printerApi, 'dismissStalePendingJobs').mockResolvedValue();
    const claimSpy = vi.spyOn(printerApi, 'claimJob').mockResolvedValue(true);
    const markCompletedSpy = vi.spyOn(printerApi, 'markJobCompleted').mockResolvedValue();

    await usePrinterStationStore.getState().drainPendingJobsQueue();

    expect(dismissSpy).toHaveBeenCalledWith(['chit-old']);
    expect(claimSpy).toHaveBeenCalledWith('rcpt-1');
    expect(claimSpy).toHaveBeenCalledWith('kick-1');
    expect(claimSpy).toHaveBeenCalledWith('chit-new');
    expect(claimSpy).not.toHaveBeenCalledWith('chit-old');
    expect(markCompletedSpy).toHaveBeenCalledWith('rcpt-1');
    expect(markCompletedSpy).toHaveBeenCalledWith('kick-1');
    expect(markCompletedSpy).toHaveBeenCalledWith('chit-new');
  });

  it('useDeviceHardwareStation enables station when bound printer exists in localStorage', () => {
    const boundDevice = JSON.stringify({ vendorId: 0x0483, productId: 0x5743, transport: 'usb' });
    const mockStorage: Record<string, string> = {
      monks_bound_printer_device: boundDevice,
    };

    useDeviceHardwareStation.setState({
      isHardwareStation: Boolean(mockStorage.monks_bound_printer_device),
    });

    expect(useDeviceHardwareStation.getState().isHardwareStation).toBe(true);
  });
});
