'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  UserCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { QRScannerService, parsePersonQR, type QRIdentityResolution, type QRPayload } from '@/lib/mobile/qr-scanner';
import type { AttendanceStatus, Profile } from '@/types/database';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  sessionId: string;
  sessionStatus: 'OPEN' | 'LOCKED';
  sessionDate?: string;
  trainees: Profile[];
  onRecordAttendance: (traineeId: string, status: AttendanceStatus) => Promise<{ success: boolean; message: string }>;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  groupId,
  sessionId,
  sessionStatus,
  sessionDate,
  trainees,
  onRecordAttendance,
}: QRScannerModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('PRESENT');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Handle scanned raw payload
  const handleProcessRawQR = useCallback(
    async (raw: string) => {
      if (!raw || processing) return;
      setProcessing(true);
      setStatusNotice(null);

      try {
        const parsed: QRPayload = QRScannerService.parsePayload(raw);

        if (!parsed.isValid || parsed.type !== 'PERSON_IDENTITY' || !parsed.personId) {
          setStatusNotice({
            type: 'error',
            message: 'رمز QR غير صالح أو لا يحتوي على معرف المتدرب المعتمد.',
          });
          setProcessing(false);
          return;
        }

        // Authoritative ID-first lookup in the current group
        const matchedPerson = trainees.find((t) => t.id === parsed.personId);

        if (!matchedPerson) {
          setStatusNotice({
            type: 'error',
            message: `المتدرب ذو المعرف (${parsed.personId}) غير موجود في الفرقة الحالية.`,
          });
          setProcessing(false);
          return;
        }

        // Secondary Name Verification
        const resolution: QRIdentityResolution = QRScannerService.resolvePersonIdentity(parsed, matchedPerson);

        if (resolution.status === 'IDENTITY_MISMATCH') {
          setStatusNotice({
            type: 'warning',
            message: `تحذير مطابقة الهوية: الاسم بالرمز (${resolution.qrName}) لا يطابق المسجل (${resolution.actualName}).`,
          });
          setProcessing(false);
          return;
        }

        if (resolution.status === 'MATCH') {
          const result = await onRecordAttendance(matchedPerson.id, selectedStatus);
          if (result.success) {
            setStatusNotice({
              type: 'success',
              message: `تم رصد حضور المتدرب ${matchedPerson.full_name} (${selectedStatus === 'PRESENT' ? 'حاضر ✓' : selectedStatus === 'LATE' ? 'متأخر ⏱' : 'غائب ✕'}) بنجاح!`,
            });
          } else {
            setStatusNotice({
              type: 'error',
              message: result.message || 'فشل في حفظ الحضور.',
            });
          }
        }
      } catch (err: any) {
        setStatusNotice({
          type: 'error',
          message: err?.message || 'حدث خطأ أثناء معالجة رمز QR.',
        });
      } finally {
        setProcessing(false);
      }
    },
    [processing, trainees, selectedStatus, onRecordAttendance]
  );

  // Start video stream & scanner loop
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setStatusNotice(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة في هذا المتصفح. يمكنك إدخال الرمز أو لصق النص يدويًا.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
        setIsScanning(true);

        // Frame loop for BarcodeDetector if available
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const scanFrame = async () => {
            if (videoRef.current && streamRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  await handleProcessRawQR(barcodes[0].rawValue);
                }
              } catch (err) {}
            }
            if (streamRef.current) {
              animFrameRef.current = requestAnimationFrame(scanFrame);
            }
          };
          animFrameRef.current = requestAnimationFrame(scanFrame);
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('تعذر فتح الكاميرا. يرجى التأكد من منح الإذن لاستخدام الكاميرا.');
      setIsScanning(false);
    }
  }, [handleProcessRawQR]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setStatusNotice(null);
      setManualInput('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nav/80 backdrop-blur-md" dir="rtl">
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all border"
        style={{
          backgroundColor: 'var(--bg-card, #0e182d)',
          borderColor: 'var(--border-card, #253556)',
          color: 'var(--text-primary, #f8fafc)',
        }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-line/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold/15 border border-gold/30 text-gold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-content flex items-center gap-1.5">
                <span>ماسح الـ QR الذكي لرصد الحضور</span>
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </h3>
              <p className="text-[11px] text-content-muted">
                {sessionDate ? `جلسة جمعة: ${sessionDate}` : 'رصد الحضور الفوري'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-nav/80 hover:bg-nav text-content-muted hover:text-content border border-line transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Selector Bar */}
        <div className="p-3 bg-nav/60 border-b border-line/60 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-content-secondary">الحالة المراد رصدها:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedStatus('PRESENT')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === 'PRESENT'
                  ? 'bg-success text-content font-black shadow-md'
                  : 'bg-nav text-content-muted hover:text-success'
              }`}
            >
              حاضر ✓
            </button>
            <button
              onClick={() => setSelectedStatus('LATE')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === 'LATE'
                  ? 'bg-warning text-content font-black shadow-md'
                  : 'bg-nav text-content-muted hover:text-warning'
              }`}
            >
              متأخر ⏱
            </button>
            <button
              onClick={() => setSelectedStatus('ABSENT')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === 'ABSENT'
                  ? 'bg-danger text-content font-black shadow-md'
                  : 'bg-nav text-content-muted hover:text-danger'
              }`}
            >
              غائب ✕
            </button>
          </div>
        </div>

        {/* Viewfinder / Camera Section */}
        <div className="p-4 flex flex-col items-center gap-4">
          <div className="relative w-full aspect-square max-w-xs rounded-2xl overflow-hidden bg-nav border-2 border-dashed border-gold/40 flex items-center justify-center shadow-inner">
            {isScanning ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" />
                {/* Animated scanning line overlay */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse shadow-lg" style={{ top: '50%' }} />
                <div className="absolute inset-4 border border-gold/30 rounded-xl pointer-events-none" />
              </>
            ) : cameraError ? (
              <div className="p-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
                <p className="text-xs text-content-secondary">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-1.5 rounded-xl bg-nav hover:bg-input text-xs font-bold text-content border border-line inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            ) : (
              <div className="text-center p-6 space-y-2">
                <Camera className="w-8 h-8 text-content-muted mx-auto animate-pulse" />
                <p className="text-xs text-content-muted">جاري تهيئة الكاميرا...</p>
              </div>
            )}
          </div>

          {/* Feedback Notices */}
          {statusNotice && (
            <div
              className={`w-full p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                statusNotice.type === 'success'
                  ? 'bg-canvas/70 border-success text-success'
                  : statusNotice.type === 'error'
                  ? 'bg-canvas/70 border-danger text-danger'
                  : statusNotice.type === 'warning'
                  ? 'bg-canvas/70 border-warning text-warning'
                  : 'bg-canvas/70 border-line-subtle text-info'
              }`}
            >
              {statusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusNotice.message}</span>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="w-full pt-2 border-t border-line/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-content-muted">
              <span>إدخال نص أو رمز الـ QR يدوياً:</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessRawQR(manualInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="EKQR:v1|ID|Name أو الصق الـ QR..."
                className="flex-1 bg-nav border border-line rounded-xl px-3 py-2 text-xs text-content placeholder-content-muted focus:outline-none focus:border-gold/60"
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || processing}
                className="px-4 py-2 rounded-xl bg-gold hover:bg-warning disabled:opacity-50 text-content font-bold text-xs transition-all shadow-md"
              >
                {processing ? 'جاري الرصد...' : 'رصد'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-nav/60 border-t border-line/60 flex items-center justify-between text-[11px] text-content-muted">
          <span>الفرقة: {groupId === 1 ? 'الأولى' : groupId === 2 ? 'الثانية' : 'الثالثة'}</span>
          <span>حالة الجلسة: {sessionStatus === 'OPEN' ? 'مفتوحة للرصد' : 'مغلقة'}</span>
        </div>
      </div>
    </div>
  );
}
