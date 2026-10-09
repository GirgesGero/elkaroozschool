'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  Cake,
  BookOpen,
  Users,
  Award,
  CalendarCheck,
  Flame,
  ArrowRight,
  Check,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface NotificationRecord {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'PASTORAL' | 'SYSTEM'>('ALL');

  const fetchNotifications = async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userProfile) setProfile(userProfile);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Notifications fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [router]);

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const handleMarkAllAsRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', profile.id);
  };

  const filteredList = notifications.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.is_read;
    if (activeFilter === 'PASTORAL') return n.type === 'PASTORAL' || n.type === 'BIRTHDAY';
    if (activeFilter === 'SYSTEM') return n.type !== 'PASTORAL' && n.type !== 'BIRTHDAY';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BIRTHDAY':
        return <Cake className="w-5 h-5 text-rose-400" />;
      case 'PASTORAL':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'MARATHON':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'EXAM':
        return <Award className="w-5 h-5 text-purple-400" />;
      case 'ATTENDANCE':
        return <CalendarCheck className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-[#c29938]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950" dir="rtl">
      {/* Smart Header */}
      <SmartHeader
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      {/* Profile Modal */}
      <UnifiedProfileModal
        profileId={selectedProfileId}
        currentUser={profile}
        onClose={() => setSelectedProfileId(null)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-28 md:pb-12">
        {/* Title & Mark All as Read */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#c29938]/15 border border-[#c29938]/40 text-[#c29938] flex items-center justify-center shadow-md">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100">مركز الإشعارات</h1>
              <span className="text-xs text-slate-400">
                {unreadCount > 0 ? `لديك ${unreadCount} إشعار جديد غير مقروء` : 'جميع الإشعارات مقروءة ومحدثة'}
              </span>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#c29938]/50 text-xs font-bold text-[#c29938] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Filters Tabs */}
        <div className="flex items-center gap-2 mb-4 p-1.5 bg-[#0a101d] rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'ALL'
                ? 'bg-[#c29938] text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الكل ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('UNREAD')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'UNREAD'
                ? 'bg-[#c29938] text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            غير المقروءة ({unreadCount})
          </button>
          <button
            onClick={() => setActiveFilter('PASTORAL')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'PASTORAL'
                ? 'bg-[#c29938] text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الرعاية والافتقاد
          </button>
          <button
            onClick={() => setActiveFilter('SYSTEM')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'SYSTEM'
                ? 'bg-[#c29938] text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تنبيهات النظام
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-2 border-[#c29938] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            جاري تحميل الإشعارات...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0a101d] border border-slate-800 text-center">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-black text-slate-200">لا توجد إشعارات هنا</h4>
            <p className="text-xs text-slate-500 mt-1">ستصلك هنا كافة رسائل الافتقاد والتنبيهات المدرسية</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                  if (notif.action_url) router.push(notif.action_url);
                }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  notif.is_read
                    ? 'bg-[#0a101d]/80 border-slate-800/80 hover:border-slate-700'
                    : 'bg-gradient-to-l from-[#0e172a] via-[#101b33] to-[#0a101d] border-[#c29938]/40 shadow-lg shadow-[#c29938]/5 hover:border-[#c29938]'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    notif.is_read
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-[#c29938]/15 border-[#c29938]/30 shadow-inner'
                  }`}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-black ${notif.is_read ? 'text-slate-200' : 'text-[#c29938]'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.created_at).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>

                  {notif.action_url && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-[#c29938]">
                      <span>انقر للانتقال</span>
                      <ArrowRight className="w-3.5 h-3.5 -rotate-180" />
                    </div>
                  )}
                </div>

                {!notif.is_read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#c29938] shrink-0 mt-1.5 shadow-md shadow-[#c29938]/50 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Smart Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        unreadNotificationsCount={unreadCount}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
