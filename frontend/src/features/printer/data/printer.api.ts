import { supabase } from '@/features/shared/infrastructure/supabase';
import type { Database } from '@monks/shared';

export type PrintJobStatus = Database['public']['Enums']['print_job_status'];

export interface PrintJobItem {
  id: string;
  job_type: string;
  receipt_data: any;
  status: PrintJobStatus;
  created_at: string;
  printed_at: string | null;
}

export const printerApi = {
  /**
   * Fetch recent print jobs (most recent first)
   */
  async getRecentPrintJobs(limit = 30): Promise<PrintJobItem[]> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[printerApi.getRecentPrintJobs] Failed to fetch print jobs:', error);
      throw error;
    }

    return (data || []) as PrintJobItem[];
  },

  /**
   * Trigger reprint for an existing print job by inserting a new PENDING job
   */
  async reprintJob(originalJob: PrintJobItem): Promise<PrintJobItem> {
    const rawData = originalJob.receipt_data || {};
    const markedData = {
      ...rawData,
      isReprint: true,
      originalJobId: originalJob.id,
      reprintedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        job_type: originalJob.job_type,
        receipt_data: markedData,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      console.error('[printerApi.reprintJob] Failed to reprint job:', error);
      throw error;
    }

    return data as PrintJobItem;
  },

  /**
   * Enqueue a test manual cash drawer kick diagnostic job
   */
  async kickCashDrawer(): Promise<PrintJobItem> {
    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        job_type: 'CUSTOMER_RECEIPT',
        receipt_data: {
          receiptNumber: `TEST-DRAWER-${Date.now().toString().slice(-4)}`,
          paymentMethod: 'CASH',
          total: 0,
          tendered: 0,
          change: 0,
          items: [],
          timestamp: new Date().toISOString(),
          isDiagnosticKick: true,
        },
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      console.error('[printerApi.kickCashDrawer] Failed to enqueue drawer test:', error);
      throw error;
    }

    return data as PrintJobItem;
  },
};
