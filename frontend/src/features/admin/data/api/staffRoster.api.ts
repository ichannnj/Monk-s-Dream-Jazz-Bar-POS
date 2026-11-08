import { supabase } from '@/features/shared/infrastructure/supabase';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import {
  PH_MINIMUM_WAGE_DAILY,
  type CreateNonWorkflowStaffPayload,
  type CreateStaffUserPayload,
  type StaffMemberAdmin,
  type UpdateStaffMemberPayload,
} from '../admin.types';

export const staffRosterApi = {
  async getStaffRoster(): Promise<StaffMemberAdmin[]> {
    const normalizeRoster = (rows: any[]): StaffMemberAdmin[] => {
      return rows.map((row) => {
        if (row.role === 'admin') {
          return { ...row, base_daily_rate: 0 };
        }
        const rawRate = parseFloat(String(row.base_daily_rate ?? 0));
        if (isNaN(rawRate) || rawRate <= 200) {
          supabase
            .from('users')
            .update({ base_daily_rate: PH_MINIMUM_WAGE_DAILY })
            .eq('id', row.id)
            .then(() => {});
          return { ...row, base_daily_rate: PH_MINIMUM_WAGE_DAILY };
        }
        return row;
      });
    };

    const { data, error } = await (supabase.from('users') as any)
      .select(
        'id, username, display_name, role, job_title, is_workflow_staff, base_daily_rate, email, phone, avatar_url, is_active, created_at'
      )
      .order('is_workflow_staff', { ascending: false })
      .order('display_name', { ascending: true });

    if (error) {
      const fallback = await supabase
        .from('users')
        .select(
          'id, username, display_name, role, is_workflow_staff, base_daily_rate, email, phone, avatar_url, is_active, created_at'
        )
        .order('is_workflow_staff', { ascending: false })
        .order('display_name', { ascending: true });
      if (fallback.error) throw fallback.error;
      return normalizeRoster(fallback.data || []);
    }
    return normalizeRoster(data || []);
  },

  async createStaffUser(payload: CreateStaffUserPayload): Promise<StaffMemberAdmin> {
    const cleanUsername = payload.username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanPin = payload.pin.trim();

    if (!cleanUsername) {
      throw new Error('Staff ID / Username is required.');
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      throw new Error('A 4-digit numeric PIN is required for POS user accounts.');
    }

    const isRoleAdmin = payload.role === 'admin';
    const effectiveBaseRate = isRoleAdmin ? 0 : payload.base_daily_rate;

    if (isRoleAdmin && payload.password) {
      const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)(
        'create_staff_account_with_secrets',
        {
          p_display_name: payload.display_name.trim(),
          p_username: cleanUsername,
          p_pin: cleanPin,
          p_role: payload.role,
          p_job_title: payload.job_title?.trim() || null,
          p_base_daily_rate: 0,
          p_phone: payload.phone?.trim() || null,
          p_email: payload.email?.trim() || null,
          p_password: payload.password,
        }
      );
      if (rpcErr) {
        throw new Error(rpcErr.message || 'Failed to create admin user with credentials');
      }
      if (rpcRes && !rpcRes.success) {
        throw new Error(rpcRes.error || 'Failed to create admin user account');
      }
      if (rpcRes && rpcRes.success) {
        const { data: createdUser, error: userErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', rpcRes.userId)
          .single();
        if (userErr) throw userErr;
        if (createdUser) {
          realtimeGateway.broadcastPosSync('staff_user_created');
          return createdUser as StaffMemberAdmin;
        }
      }
    }

    const insertRow: Record<string, any> = {
      display_name: payload.display_name.trim(),
      username: cleanUsername,
      pin: cleanPin,
      role: payload.role,
      job_title: payload.job_title?.trim() || null,
      is_workflow_staff: true,
      base_daily_rate: effectiveBaseRate,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      avatar_url: payload.avatar_url?.trim() || null,
      is_active: true,
    };

    const { data, error } = await (supabase.from('users') as any)
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('job_title')) {
        delete insertRow.job_title;
        const retry = await (supabase.from('users') as any).insert(insertRow).select().single();
        if (retry.error) throw retry.error;
        realtimeGateway.broadcastPosSync('staff_user_created');
        return retry.data as StaffMemberAdmin;
      }
      throw error;
    }

    realtimeGateway.broadcastPosSync('staff_user_created');
    return data as StaffMemberAdmin;
  },

  async createNonWorkflowStaff(payload: CreateNonWorkflowStaffPayload): Promise<StaffMemberAdmin> {
    const cleanTitle = payload.job_title.trim();
    const slugBase = payload.display_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const resolvedUsername =
      payload.username?.trim().toLowerCase().replace(/\s+/g, '_') ||
      `staff_${slugBase || 'member'}_${randomSuffix}`;

    const insertRow: Record<string, any> = {
      display_name: payload.display_name.trim(),
      username: resolvedUsername,
      pin: payload.pin?.trim() || '0000',
      role: 'waiter',
      job_title: cleanTitle || 'Venue Staff',
      is_workflow_staff: false,
      base_daily_rate: payload.base_daily_rate,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      avatar_url: payload.avatar_url?.trim() || null,
      is_active: true,
    };

    const { data, error } = await (supabase.from('users') as any)
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      const fallbackRow = { ...insertRow };
      if (error.message?.includes('job_title')) {
        delete fallbackRow.job_title;
      }
      if (error.message?.includes('pin') || error.code === '23502') {
        fallbackRow.pin = '0000';
      }
      const retry = await (supabase.from('users') as any).insert(fallbackRow).select().single();
      if (retry.error) throw retry.error;
      realtimeGateway.broadcastPosSync('staff_member_created');
      return { ...retry.data, job_title: cleanTitle } as StaffMemberAdmin;
    }

    realtimeGateway.broadcastPosSync('staff_member_created');
    return data as StaffMemberAdmin;
  },

  async updateStaffMember(
    id: string,
    payload: UpdateStaffMemberPayload
  ): Promise<StaffMemberAdmin> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.display_name !== undefined) updateData.display_name = payload.display_name.trim();
    if (payload.username !== undefined) {
      updateData.username = payload.username
        .trim()
        .toLowerCase()
        .replace(/^@+/, '')
        .replace(/\s+/g, '_');
    }
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.job_title !== undefined) updateData.job_title = payload.job_title?.trim() || null;
    if (payload.role === 'admin') {
      updateData.base_daily_rate = 0;
    } else if (payload.base_daily_rate !== undefined) {
      updateData.base_daily_rate = payload.base_daily_rate;
    }
    if (payload.email !== undefined) updateData.email = payload.email?.trim() || null;
    if (payload.phone !== undefined) updateData.phone = payload.phone?.trim() || null;
    if (payload.avatar_url !== undefined)
      updateData.avatar_url = payload.avatar_url?.trim() || null;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    const { data, error } = await (supabase.from('users') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('job_title')) {
        delete updateData.job_title;
        const retry = await (supabase.from('users') as any)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (retry.error) throw retry.error;
        realtimeGateway.broadcastPosSync('staff_member_updated');
        return retry.data as StaffMemberAdmin;
      }
      throw error;
    }

    realtimeGateway.broadcastPosSync('staff_member_updated');
    return data as StaffMemberAdmin;
  },

  async resetAdminPassword(targetUserId: string, newPassword: string): Promise<void> {
    const cleanPass = newPassword.trim();
    if (cleanPass.length < 8) {
      throw new Error('Admin password must be at least 8 characters long.');
    }

    const { data, error } = await (supabase.rpc as any)('admin_reset_user_password', {
      p_target_user_id: targetUserId,
      p_new_password: cleanPass,
    });

    if (error) throw new Error(error.message);
    if (!data || !(data as any).success) {
      throw new Error((data as any)?.error || 'Failed to reset admin password.');
    }

    realtimeGateway.broadcastPosSync('staff_password_reset');
  },

  async resetStaffPin(id: string, newPin: string): Promise<void> {
    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      throw new Error('PIN must be exactly 4 numeric digits.');
    }

    const { error } = await supabase
      .from('users')
      .update({
        pin: cleanPin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    realtimeGateway.broadcastPosSync('staff_pin_reset');
  },

  async toggleStaffStatus(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },
};
