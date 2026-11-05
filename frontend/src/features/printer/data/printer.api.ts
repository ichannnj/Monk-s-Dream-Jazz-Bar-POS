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
   * Fetch unprinted pending jobs (oldest first)
   */
  async getPendingPrintJobs(): Promise<PrintJobItem[]> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[printerApi.getPendingPrintJobs] Failed to fetch pending jobs:', error);
      throw error;
    }

    return (data || []) as PrintJobItem[];
  },

  /**
   * Optimistically claim a print job so only one workstation tab prints it
   */
  async claimJob(jobId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('print_jobs')
      .update({ status: 'PRINTING' })
      .eq('id', jobId)
      .eq('status', 'PENDING')
      .select('id');

    if (error) {
      console.error(`[printerApi.claimJob] Error claiming job ${jobId}:`, error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  },

  /**
   * Mark print job completed after successful hardware dispatch
   */
  async markJobCompleted(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('print_jobs')
      .update({
        status: 'COMPLETED',
        printed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error(`[printerApi.markJobCompleted] Error updating job ${jobId}:`, error);
    }
  },

  /**
   * Mark print job failed if hardware write fails
   */
  async markJobFailed(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('print_jobs')
      .update({ status: 'FAILED' })
      .eq('id', jobId);

    if (error) {
      console.error(`[printerApi.markJobFailed] Error marking job failed ${jobId}:`, error);
    }
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
