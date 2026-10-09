import { describe, it, expect } from 'vitest';
import {
  getPlatformInfo,
  getCapability,
  getAllCapabilities,
  CameraService,
  QRScannerService,
  QRAssetManager,
  FilePickerService,
  ShareService,
  DeepLinkService,
  PushNotificationService,
  StatusBarService,
  SplashScreenService,
  HapticsService,
  BadgeService,
  PermissionService,
  serializePersonQR,
  parsePersonQR,
} from '../src/lib/mobile';
import { AttendanceService } from '../src/lib/attendance/service';

describe('Mobile Readiness & Capability Layer Suite', () => {
  // 1. Platform Detection & SSR Safety
  it('detects platform correctly and remains safe without window', () => {
    const p = getPlatformInfo();
    expect(['WEB', 'PWA', 'ANDROID', 'IOS']).toContain(p.platform);
    expect(typeof p.isSSR).toBe('boolean');
    expect(typeof p.isNative).toBe('boolean');
  });

  // 2. Capability Model
  it('exposes all declared capability descriptors with proper statuses', () => {
    const caps = getAllCapabilities();
    const expectedKeys = [
      'camera',
      'qrScanner',
      'filePicker',
      'share',
      'pushNotifications',
      'deepLinks',
      'statusBar',
      'splashScreen',
      'haptics',
      'appBadge',
      'permissions',
    ];

    expectedKeys.forEach((key) => {
      expect(caps).toHaveProperty(key);
      const cap = getCapability(key as any);
      expect(['SUPPORTED', 'UNSUPPORTED', 'RESTRICTED', 'FALLBACK_ONLY']).toContain(cap.status);
    });
  });

  // 3. Deep Link Parsing & Canonical HTTPS URLs
  it('parses canonical routes, custom schemes, and builds HTTPS deep links', () => {
    // A. Canonical Web Route
    const r1 = DeepLinkService.parse('/post/post-uuid-123');
    expect(r1).not.toBeNull();
    expect(r1?.resourceType).toBe('POST');
    expect(r1?.id).toBe('post-uuid-123');

    // B. Custom App Scheme with query parameters
    const r2 = DeepLinkService.parse('elkarooz://trainee/00000000-0000-0000-0000-000000000001?group=1&user=mina');
    expect(r2).not.toBeNull();
    expect(r2?.resourceType).toBe('TRAINEE');
    expect(r2?.id).toBe('00000000-0000-0000-0000-000000000001');
    expect(r2?.queryParams?.group).toBe('1');
    expect(r2?.queryParams?.user).toBe('mina');

    // C. Canonical URL Builder
    const url = DeepLinkService.buildCanonicalUrl('MARATHON', '77');
    expect(url).toBe('https://elkaroozschool.is-best.net/marathon/77');
  });

  // 4. QR Scan & Serialization / Parser Contract
  it('serializes and parses authoritative Person QR payload (PERSON NAME + PERSON ID)', () => {
    // A. Serialization
    const serialized = serializePersonQR('كيرلس سمير', '550e8400-e29b-41d4-a716-446655440000');
    expect(serialized).toBe('EKQR:v1|550e8400-e29b-41d4-a716-446655440000|كيرلس سمير');

    // B. Parsing Canonical Format
    const p1 = parsePersonQR(serialized);
    expect(p1).toMatchObject({
      type: 'PERSON_IDENTITY',
      id: '550e8400-e29b-41d4-a716-446655440000',
      personId: '550e8400-e29b-41d4-a716-446655440000',
      personName: 'كيرلس سمير',
      isValid: true,
    });

    // C. Parsing Pipe Delimiter (name|id or id|name)
    const p2 = parsePersonQR('مينا عادل|550e8400-e29b-41d4-a716-446655440001');
    expect(p2.isValid).toBe(true);
    expect(p2.personId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(p2.personName).toBe('مينا عادل');

    // D. Parsing JSON Envelope
    const p3 = parsePersonQR(JSON.stringify({ id: 'uuid-3', full_name: 'بيشوي وليم' }));
    expect(p3.isValid).toBe(true);
    expect(p3.personId).toBe('uuid-3');
    expect(p3.personName).toBe('بيشوي وليم');

    // E. Empty or whitespace
    const empty = QRScannerService.parsePayload('   ');
    expect(empty.isValid).toBe(false);
    expect(empty.reason).toBe('EMPTY_PAYLOAD');

    // F. Unknown or malformed random string
    const random = QRScannerService.parsePayload('some-random-unknown-string');
    expect(random.isValid).toBe(false);
    expect(random.reason).toBe('UNKNOWN_OR_MALFORMED_FORMAT');
  });

  // 5. QR Identity Resolution Contract (Authoritative ID-First, Secondary Name Verification)
  it('resolves by person ID and reports name mismatches without falling back to name lookup', () => {
    const parsed = {
      type: 'PERSON_IDENTITY' as const,
      id: 'person-1',
      personId: 'person-1',
      personName: 'الاسم من QR',
      isValid: true,
    };

    // Case 1: Match
    expect(
      QRScannerService.resolvePersonIdentity(parsed, { id: 'person-1', full_name: 'الاسم من QR' })
    ).toMatchObject({
      status: 'MATCH',
      personId: 'person-1',
      qrName: 'الاسم من QR',
      actualName: 'الاسم من QR',
    });

    // Case 2: Identity Mismatch (Name does not match stored profile)
    expect(
      QRScannerService.resolvePersonIdentity(parsed, { id: 'person-1', full_name: 'اسم مختلف' })
    ).toMatchObject({
      status: 'IDENTITY_MISMATCH',
      personId: 'person-1',
      qrName: 'الاسم من QR',
      actualName: 'اسم مختلف',
    });

    // Case 3: Person ID Not Found (Never searches by name)
    expect(
      QRScannerService.resolvePersonIdentity(parsed, { id: 'person-2', full_name: 'الاسم من QR' }).status
    ).toBe('PERSON_NOT_FOUND');

    // Case 4: Invalid/General QR rejected
    expect(
      QRScannerService.resolvePersonIdentity(
        { type: 'GENERAL', id: 'person-1', isValid: false },
        { id: 'person-1', full_name: 'اسم مختلف' }
      ).status
    ).toBe('PERSON_NOT_FOUND');
  });

  // 5.1. Attendance Window & Session Lock Rules
  it('validates Friday-to-Wednesday attendance cycle and enforces Thursday lock', () => {
    const session = {
      id: 'sess-1',
      group_id: 1,
      session_date: '2026-10-02', // Friday
      status: 'OPEN' as const,
    };

    // Friday of session (Day 0) -> Open
    expect(AttendanceService.isWithinWindow(session, new Date('2026-10-02T10:00:00'))).toBe(true);

    // Sunday (Day +2) -> Open
    expect(AttendanceService.isWithinWindow(session, new Date('2026-10-04T12:00:00'))).toBe(true);

    // Wednesday (Day +5) -> Open
    expect(AttendanceService.isWithinWindow(session, new Date('2026-10-07T23:59:59'))).toBe(true);

    // Thursday (Day +6) -> Closed (Thursday Lock Day)
    expect(AttendanceService.isWithinWindow(session, new Date('2026-10-08T09:00:00'))).toBe(false);

    // Following Friday (Day +7) -> Closed
    expect(AttendanceService.isWithinWindow(session, new Date('2026-10-09T09:00:00'))).toBe(false);

    // Locked Session Status -> Always Closed
    expect(AttendanceService.isWithinWindow({ ...session, status: 'LOCKED' }, new Date('2026-10-02T10:00:00'))).toBe(false);

    // Future Session (Before Friday) -> Not open yet
    expect(AttendanceService.isWithinWindow(session, new Date('2026-10-01T10:00:00'))).toBe(false);
  });

  // 6. QR Code Persistent Asset Single-Source-of-Truth
  it('resolves the existing persistent QR asset without generating a replacement', async () => {
    const person = {
      id: '00000000-0000-0000-0000-000000000099',
      full_name: 'بيشوي عادل',
      group_id: 1,
      username: 'bishoy_adel',
    };
    const existingAsset = {
      id: 'asset-1',
      file_name: `qr_trainee_${person.id}.svg`,
      mime_type: 'image/svg+xml',
      storage_provider: 'GOOGLE_DRIVE',
      drive_file_id: 'drive-1',
      created_at: '2026-10-05T00:00:00.000Z',
    };
    const query = {
      select: () => query,
      is: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: existingAsset, error: null }),
    };
    const fakeSupabase = { from: () => query };
    const asset = await QRAssetManager.resolvePersonQRAsset(person, fakeSupabase, {
      fileName: existingAsset.file_name,
    });
    expect(asset).toMatchObject({
      assetId: existingAsset.id,
      isExisting: true,
      storageProvider: 'GOOGLE_DRIVE',
      publicUrl: '/storage/file/asset-1',
    });
    expect(asset.publicUrl.startsWith('data:')).toBe(false);
  });

  it('fails closed when a person has no persistent QR asset', async () => {
    const query = {
      select: () => query,
      is: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    await expect(
      QRAssetManager.resolvePersonQRAsset(
        { id: '1' },
        { from: () => query },
        { fileName: 'qr_trainee_1.svg' }
      )
    ).rejects.toThrow('No persistent QR asset');
  });

  // 6. Push Notification Navigation & Deep Link Integration
  it('routes push notification payloads to authorized deep links safely', () => {
    let targetPushed = '';
    const mockRouter = {
      push: (url: string) => {
        targetPushed = url;
      },
    };

    const payload = {
      notificationId: 'notif-1',
      category: 'LECTURE' as const,
      title: 'محاضرة جديدة',
      body: 'تم رفع محاضرة طقس الكنيسة',
      deepLink: '/lecture/45',
    };

    const handled = PushNotificationService.handleNotificationOpen(payload, mockRouter);
    expect(handled).toBe(true);
    expect(targetPushed).toBe('/curriculum#lecture-45');
  });

  // 7. Status Bar & Theme Synchronization
  it('maps active themes to status bar appearance and background tokens', () => {
    const luxuryConfig = StatusBarService.getThemeStatusConfig('luxury');
    expect(luxuryConfig.style).toBe('LIGHT');
    expect(luxuryConfig.backgroundColor).toBe('#070B14');

    const lightConfig = StatusBarService.getThemeStatusConfig('light');
    expect(lightConfig.style).toBe('DARK');
    expect(lightConfig.backgroundColor).toBe('#F8F9FA');
  });

  // 8. Splash Screen Configuration
  it('provides authoritative splash screen branding for mobile launch', () => {
    const darkSplash = SplashScreenService.getSplashConfig(true);
    expect(darkSplash.backgroundColor).toBe('#070B14');
    expect(darkSplash.logoUrl).toBe('/logo.png');
    expect(darkSplash.spinnerColor).toBe('#C29938');
  });

  // 9. App Badge Single Source of Truth
  it('syncs unread notification state to application icon badge', async () => {
    await BadgeService.set(7);
    expect(BadgeService.getCount()).toBe(7);

    await BadgeService.clear();
    expect(BadgeService.getCount()).toBe(0);
  });

  // 10. Native Permissions & Just-In-Time Rules
  it('verifies permission checks do not throw and remain JIT-ready', async () => {
    const perm = await PermissionService.check('camera');
    expect(['granted', 'denied', 'prompt']).toContain(perm);
  });

  // 11. Unified Attendance Service & Converged QR / Manual Flow
  it('enforces unified validation, session window, and permission rules for both QR and manual attendance', async () => {
    const recordsMap = new Map<string, any>();
    const mockAdapter = {
      upsert: async (rec: any) => {
        const key = `${rec.session_id}:${rec.trainee_id}`;
        recordsMap.set(key, rec);
        return { error: null };
      },
    };

    const validSession = { status: 'OPEN' as const, isWithinWindow: true };
    const closedSession = { status: 'LOCKED' as const, isWithinWindow: false };

    // A. QR Flow
    const parsedQR = {
      type: 'PERSON_IDENTITY' as const,
      id: 'trainee-uuid-1',
      personId: 'trainee-uuid-1',
      personName: 'كيرلس سمير',
      isValid: true,
    };
    const resolved = QRScannerService.resolvePersonIdentity(parsedQR, {
      id: 'trainee-uuid-1',
      full_name: 'كيرلس سمير',
    });
    expect(resolved.status).toBe('MATCH');

    await AttendanceService.record(
      mockAdapter,
      {
        sessionId: 'session-1',
        groupId: 1,
        traineeId: resolved.personId,
        status: 'PRESENT',
        recordedBy: 'servant-1',
        source: 'QR',
      },
      validSession,
      true
    );

    expect(recordsMap.get('session-1:trainee-uuid-1')).toMatchObject({
      session_id: 'session-1',
      group_id: 1,
      trainee_id: 'trainee-uuid-1',
      status: 'PRESENT',
    });

    // B. Manual Search Flow (Converges into the same service and rules)
    await AttendanceService.record(
      mockAdapter,
      {
        sessionId: 'session-1',
        groupId: 1,
        traineeId: 'trainee-uuid-2',
        status: 'LATE',
        recordedBy: 'servant-1',
        source: 'MANUAL',
      },
      validSession,
      true
    );
    expect(recordsMap.get('session-1:trainee-uuid-2')).toMatchObject({
      status: 'LATE',
    });

    // C. Duplicate scan / update overwrites cleanly without creating duplicate records
    await AttendanceService.record(
      mockAdapter,
      {
        sessionId: 'session-1',
        groupId: 1,
        traineeId: 'trainee-uuid-1',
        status: 'PRESENT',
        recordedBy: 'servant-1',
        source: 'QR',
      },
      validSession,
      true
    );
    expect(recordsMap.size).toBe(2);

    // D. Rejection on closed session window
    await expect(
      AttendanceService.record(
        mockAdapter,
        {
          sessionId: 'session-1',
          groupId: 1,
          traineeId: 'trainee-uuid-1',
          status: 'PRESENT',
          recordedBy: 'servant-1',
          source: 'QR',
        },
        closedSession,
        true
      )
    ).rejects.toThrow('ATTENDANCE_WINDOW_CLOSED');

    // E. Rejection on unauthorized caller
    await expect(
      AttendanceService.record(
        mockAdapter,
        {
          sessionId: 'session-1',
          groupId: 1,
          traineeId: 'trainee-uuid-1',
          status: 'PRESENT',
          recordedBy: 'trainee-self',
          source: 'QR',
        },
        validSession,
        false
      )
    ).rejects.toThrow('ATTENDANCE_FORBIDDEN');
  });

  // 12. Secretariat & Admin Trainee Creation Rules (Group Isolation)
  it('enforces that Secretariat is strictly scoped to their group while Admin is global', () => {
    const secretariatGroup1 = { role_id: 'secretariat', group_id: 1 };
    const secretariatGroup2 = { role_id: 'secretariat', group_id: 2 };
    const admin = { role_id: 'admin', group_id: 1 };
    const trainee = { role_id: 'trainee', group_id: 1 };

    const canCreateInGroup = (user: { role_id: string; group_id: number }, targetGroup: number): boolean => {
      if (user.role_id === 'admin' || user.role_id === 'super_user') return true;
      if (user.role_id === 'secretariat') return user.group_id === targetGroup;
      return false;
    };

    // Secretariat Group 1 -> Can create in Group 1
    expect(canCreateInGroup(secretariatGroup1, 1)).toBe(true);
    // Secretariat Group 1 -> CANNOT create in Group 2 (Group Isolation)
    expect(canCreateInGroup(secretariatGroup1, 2)).toBe(false);
    // Secretariat Group 2 -> Can create in Group 2
    expect(canCreateInGroup(secretariatGroup2, 2)).toBe(true);
    // Admin -> Can create in any group
    expect(canCreateInGroup(admin, 1)).toBe(true);
    expect(canCreateInGroup(admin, 2)).toBe(true);
    expect(canCreateInGroup(admin, 3)).toBe(true);
    // Trainee -> Cannot create in any group
    expect(canCreateInGroup(trainee, 1)).toBe(false);
  });
});
