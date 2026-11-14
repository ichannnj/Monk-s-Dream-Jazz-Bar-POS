import { supabase } from '@/features/shared/infrastructure/supabase';
import type { Tables, Json } from '@monks/shared';
import { PH_MINIMUM_WAGE_DAILY, type AttendanceRecordAdmin } from '../admin.types';

type AttendanceDbRow = Tables<'attendance_records'> & {
  users?: Pick<
    Tables<'users'>,
    'username' | 'display_name' | 'role' | 'job_title' | 'is_workflow_staff' | 'base_daily_rate'
  > | null;
};

export const attendancePayrollApi = {
  async getAttendanceRecords(
    startDate: string,
    endDate?: string
  ): Promise<AttendanceRecordAdmin[]> {
    let query = supabase
      .from('attendance_records')
      .select(
        '*, users(username, display_name, role, job_title, is_workflow_staff, base_daily_rate)'
      );

    if (endDate && endDate !== startDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else {
      query = query.eq('date', startDate);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return ((data || []) as unknown as AttendanceDbRow[]).map((row) => {
      const isAdmin = row.users?.role === 'admin';
      const userRate = Number(row.users?.base_daily_rate || 0);
      const rawBase = Number(row.base_daily_pay || 0);

      // Admin accounts are strictly exempt from daily payroll
      const resolvedBase = isAdmin
        ? 0
        : rawBase > 0
          ? rawBase
          : userRate > 0
            ? userRate
            : PH_MINIMUM_WAGE_DAILY;

      const addon = isAdmin ? 0 : Number(row.addon_pay || 0);
      return {
        ...row,
        base_daily_pay: resolvedBase,
        addon_pay: addon,
        total_day_pay: row.is_present && !isAdmin ? resolvedBase + addon : 0,
        user: row.users,
      };
    }) as unknown as AttendanceRecordAdmin[];
  },

  async adminUpsertAttendance(params: {
    userId: string;
    date: string;
    isPresent: boolean;
    shiftStatus: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
    baseDailyPay: number;
    addonPay: number;
    notes?: string;
  }): Promise<Json> {
    const { data, error } = await supabase.rpc('admin_upsert_attendance_record', {
      p_user_id: params.userId,
      p_date: params.date,
      p_is_present: params.isPresent,
      p_shift_status: params.shiftStatus,
      p_base_daily_pay: params.baseDailyPay,
      p_addon_pay: params.addonPay,
      p_notes: params.notes || undefined,
    });

    if (error) throw error;
    return data;
  },

  async updateDiscretionaryAddon(
    recordId: string,
    addonPay: number,
    baseRate: number,
    fallbackContext?: { userId: string; dateStr: string; isPresent?: boolean }
  ) {
    const total = baseRate + addonPay;

    if (fallbackContext?.userId) {
      await supabase
        .from('users')
        .update({
          base_daily_rate: baseRate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fallbackContext.userId);
    }

    if (recordId.startsWith('att-') && fallbackContext) {
      const { error } = await supabase.from('attendance_records').upsert(
        {
          user_id: fallbackContext.userId,
          date: fallbackContext.dateStr,
          is_present: fallbackContext.isPresent ?? true,
          base_daily_pay: baseRate,
          addon_pay: addonPay,
          total_day_pay: total,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('attendance_records')
      .update({
        base_daily_pay: baseRate,
        addon_pay: addonPay,
        total_day_pay: total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;
  },
};
