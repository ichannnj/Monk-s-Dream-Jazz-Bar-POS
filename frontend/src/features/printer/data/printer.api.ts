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
   * Enqueue a pre-payment bill statement ("Guest Check") without kicking the cash drawer
   */
  async enqueueBillStatement(receiptData: any): Promise<PrintJobItem> {
    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        job_type: 'BILL_STATEMENT',
        receipt_data: receiptData,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      console.error('[printerApi.enqueueBillStatement] Failed to enqueue bill statement:', error);
      throw error;
    }

    return data as PrintJobItem;
  },

  /**
   * Enqueue a pure cash drawer kick pulse without printing receipts or cutting paper
   */
  async kickCashDrawer(drawerTarget: 'main' | 'bar' = 'main'): Promise<PrintJobItem> {
    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        job_type: 'DRAWER_KICK',
        receipt_data: {
          isDiagnosticKick: true,
          drawerTarget,
          timestamp: new Date().toISOString(),
        },
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      console.error('[printerApi.kickCashDrawer] Failed to enqueue drawer kick:', error);
      throw error;
    }

    return data as PrintJobItem;
  },

  /**
   * Revert a claimed job back to PENDING if hardware is offline
   */
  async releaseJobToPending(jobId: string): Promise<void> {
    await supabase.from('print_jobs').update({ status: 'PENDING' }).eq('id', jobId);
  },
};
