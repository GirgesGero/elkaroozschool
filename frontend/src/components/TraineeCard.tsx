'use client';

import React from 'react';
import type { Profile } from '@/types/database';
import Avatar from '@/components/Avatar';
import {
  User,
  Phone,
  Church,
  Calendar,
  ChevronLeft,
  Power,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface TraineeCardProps {
  trainee: Profile;
  onClick: (id: string) => void;
  onToggleStatus?: (trainee: Profile, e: React.MouseEvent) => void;
  isUpdatingStatus?: boolean;
}

export default function TraineeCard({
  trainee,
  onClick,
  onToggleStatus,
  isUpdatingStatus = false,
}: TraineeCardProps) {
  const groupLabel =
    trainee.group_id === 1
      ? 'الفرقة الأولى'
      : trainee.group_id === 2
      ? 'الفرقة الثانية'
      : trainee.group_id === 3
      ? 'الفرقة الثالثة'
      : `الفرقة ${trainee.group_id}`;

  return (
    <div
      onClick={() => onClick(trainee.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(trainee.id);
        }
      }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 text-start select-none cursor-pointer ${
        trainee.is_active
          ? 'bg-nav/90 border-line hover:border-gold/50 shadow-md hover:shadow-xl hover:shadow-gold/5 hover:-translate-y-1'
          : 'bg-canvas/40 border-danger/30 opacity-80 hover:opacity-100 hover:border-danger/60 hover:-translate-y-0.5 shadow-sm'
      }`}
    >
      {/* Top Illuminated Coptic Hairline */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] transition-opacity duration-300 ${
          trainee.is_active
            ? 'bg-gradient-to-r from-transparent via-gold to-transparent opacity-40 group-hover:opacity-100'
            : 'bg-gradient-to-r from-transparent via-danger to-transparent opacity-60'
        }`}
      />

      {/* Card Body */}
      <div className="p-5">
        {/* Header: Avatar, Name, and Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Halo Avatar Sanctuary Frame */}
            <div className="relative shrink-0">
              <div
                className={`w-13 h-13 rounded-2xl p-0.5 border transition-all duration-300 flex items-center justify-center overflow-hidden ${
                  trainee.is_active
                    ? 'border-gold/40 group-hover:border-gold bg-canvas/80 group-hover:shadow-md group-hover:shadow-gold/20'
                    : 'border-line bg-canvas/60'
                }`}
              >
                {trainee.avatar_url ? (
                  <Avatar src={trainee.avatar_url} name={trainee.full_name} size={48} rounded="rounded-xl" />
                ) : (
                  <div className="w-full h-full rounded-xl bg-nav flex items-center justify-center text-gold/80 font-black text-base">
                    {trainee.full_name?.charAt(0) || <User className="w-5 h-5 text-content-muted" />}
                  </div>
                )}
              </div>

              {/* Status Jewel Dot */}
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-nav flex items-center justify-center ${
                  trainee.is_active ? 'bg-success' : 'bg-danger'
                }`}
                title={trainee.is_active ? 'حساب نشط' : 'حساب موقوف'}
              >
                {trainee.is_active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </span>
            </div>

            {/* Trainee Name and Username */}
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-sm text-content truncate group-hover:text-gold transition-colors duration-200">
                {trainee.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-content-muted font-mono truncate">
                  @{trainee.username}
                </span>
                <span className="text-line-subtle">•</span>
                <span className="text-[11px] font-bold text-gold/90 truncate">
                  {groupLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Status Pill */}
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
              trainee.is_active
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-danger/10 text-danger border-danger/30'
            }`}
          >
            {trainee.is_active ? (
              <>
                <ShieldCheck className="w-3 h-3" />
                <span>نشط</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3 h-3" />
                <span>موقوف</span>
              </>
            )}
          </span>
        </div>

        {/* Pastoral & Contact Details Bento */}
        <div className="rounded-xl bg-canvas/70 border border-line/70 p-3 space-y-2 text-xs">
          {/* Confession Father */}
          <div className="flex items-center justify-between text-content-secondary">
            <span className="text-content-muted flex items-center gap-1.5 text-[11px]">
              <Church className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>أب الاعتراف:</span>
            </span>
            <span className="font-bold truncate max-w-[170px] text-content">
              {trainee.confession_father || 'غير محدد'}
            </span>
          </div>

          {/* Phone with quick call option */}
          {trainee.phone && (
            <div className="flex items-center justify-between text-content-secondary pt-1 border-t border-line/40">
              <span className="text-content-muted flex items-center gap-1.5 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-gold shrink-0" />
                <span>الهاتف:</span>
              </span>
              <a
                href={`tel:${trainee.phone}`}
                onClick={(e) => e.stopPropagation()}
                dir="ltr"
                className="font-mono font-semibold text-content hover:text-gold transition-colors hover:underline"
              >
                {trainee.phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 py-3 bg-nav border-t border-line/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-bold text-gold group-hover:text-warning transition-colors">
          <span>السجل الأكاديمي</span>
          <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
        </div>

        {onToggleStatus && (
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(trainee, e);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
              trainee.is_active
                ? 'bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 hover:border-danger'
                : 'bg-success/10 hover:bg-success text-success hover:text-white border border-success/30 hover:border-success'
            }`}
            title={trainee.is_active ? 'إيقاف الحساب مؤقتاً' : 'تفعيل الحساب'}
          >
            <Power className="w-3 h-3 shrink-0" />
            <span>{trainee.is_active ? 'إيقاف' : 'تفعيل'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
