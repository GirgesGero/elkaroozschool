import type { AttendanceStatus } from '@/types/database';

export type AttendanceIdentitySource = 'QR' | 'MANUAL';

export interface AttendanceTarget {
  traineeId: string;
  groupId: number;
  sessionId: string;
  status: AttendanceStatus;
  recordedBy: string;
  source: AttendanceIdentitySource;
}

export interface AttendanceSessionState {
  id?: string;
  group_id?: number;
  session_date?: string;
  status: 'OPEN' | 'LOCKED';
  isWithinWindow?: boolean;
}

export interface AttendanceWriteAdapter {
  upsert: (record: {
    session_id: string;
    group_id: number;
    trainee_id: string;
    status: AttendanceStatus;
    recorded_by: string;
    updated_at: string;
  }) => Promise<{ error: { message?: string; code?: string } | null }>;
}

export class AttendanceService {
  /**
   * Validates whether a session is currently within the active attendance recording window.
   * Business rule:
   * - Session status must be OPEN
   * - If session_date is provided, recording is valid from the Friday session date through next Wednesday.
   *   (Thursday is mandatory lock day).
   */
  static isWithinWindow(session: AttendanceSessionState, currentDate: Date = new Date()): boolean {
    if (!session || session.status !== 'OPEN') {
      return false;
    }

    if (session.isWithinWindow === false) {
      return false;
    }

    if (!session.session_date) {
      return true;
    }

    const sessDate = new Date(`${session.session_date}T00:00:00`);
    if (isNaN(sessDate.getTime())) {
      return false;
    }

    // Clone current date to midnight for date-only comparison
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    // If current date is before session date, not open yet
    if (today.getTime() < sessDate.getTime()) {
      return false;
    }

    // 6 days window (Friday = day 0 through Wednesday = day +5)
    // Day +6 is Thursday (Lock day)
    const diffDays = Math.floor((today.getTime() - sessDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 5) {
      return false;
    }

    return true;
  }

  static validateTarget(
    target: AttendanceTarget,
    session: AttendanceSessionState,
    canRecord: boolean,
    now: Date = new Date()
  ): void {
    if (!canRecord) throw new Error('ATTENDANCE_FORBIDDEN');
    if (!AttendanceService.isWithinWindow(session, now)) throw new Error('ATTENDANCE_WINDOW_CLOSED');
    if (!target.traineeId || !target.groupId || !target.sessionId || !target.recordedBy) {
      throw new Error('ATTENDANCE_TARGET_INVALID');
    }
  }

  static async record(
    adapter: AttendanceWriteAdapter,
    target: AttendanceTarget,
    session: AttendanceSessionState,
    canRecord: boolean,
    now: Date = new Date()
  ): Promise<void> {
    AttendanceService.validateTarget(target, session, canRecord, now);
    const { error } = await adapter.upsert({
      session_id: target.sessionId,
      group_id: target.groupId,
      trainee_id: target.traineeId,
      status: target.status,
      recorded_by: target.recordedBy,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}
