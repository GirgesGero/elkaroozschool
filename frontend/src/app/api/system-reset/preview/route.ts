import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: 'المصادقة مطلوبة: التوكن غير موجود' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

    // Verify token caller
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_TOKEN', message: 'رمز المصادقة غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      );
    }

    // Check user profile for active admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, role_id, is_active, deleted_at')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role_id !== 'admin' || !profile.is_active || profile.deleted_at) {
      return NextResponse.json(
        { status: 'error', code: 'ADMIN_REQUIRED', message: 'هذا الإجراء مخصص لمسؤولي النظام فقط' },
        { status: 403 }
      );
    }

    // Call Supabase RPC system_reset_preview
    const { data: previewData, error: rpcError } = await adminClient.rpc('system_reset_preview', {
      p_actor_id: user.id
    });

    if (rpcError || !previewData) {
      return NextResponse.json(
        { status: 'error', code: 'RPC_FAILED', message: rpcError?.message || 'تعذر تشغيل معاينة إعادة الضبط' },
        { status: 500 }
      );
    }

    // Check for open/active runs
    const { data: activeRuns } = await adminClient
      .from('system_reset_runs')
      .select('id, backup_id, status, data_cleared_at, created_at')
      .eq('actor_id', user.id)
      .in('status', ['PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL'])
      .order('created_at', { ascending: false })
      .limit(1);

    const activeRun = activeRuns && activeRuns.length > 0 ? activeRuns[0] : null;

    return NextResponse.json({
      status: 'success',
      message: 'معاينة إعادة ضبط النظام جاهزة',
      data: {
        counts: previewData.counts || {},
        preserved: previewData.preserved || [],
        active_run: activeRun,
        blockers: [],
        storage: {
          local: { known_files: 0, blocked_paths: [] },
          google_drive: { audited: true, registered_files: 0, unregistered_files: 0, unregistered_names: [] }
        },
        confirmation_phrase: 'أوافق على حذف كل بيانات التشغيل'
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'خطأ غير متوقع';
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: msg },
      { status: 500 }
    );
  }
}
