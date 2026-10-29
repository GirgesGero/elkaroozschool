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
  category: string;
  title: string;
  body: string;
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

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id,full_name,username,role_id,group_id,is_active,phone,avatar_url,created_at')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      if (userProfile) setProfile(userProfile as Profile);

      const { data: data, error: notificationsError } = await supabase
          .from('notifications')
          .select('id,recipient_id,category,title,body,is_read,action_url,created_at')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (notificationsError) throw notificationsError;
      setNotifications(data || []);
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
    if (!profile) return;
    const supabase = createClient();
    const previous = notifications.find((n) => n.id === id)?.is_read;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('recipient_id', profile.id);
    if (error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: previous ?? false } : n)));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', profile.id)
      .eq('is_read', false);
    if (error) setNotifications(previous);
  };

  const filteredList = notifications.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.is_read;
    if (activeFilter === 'PASTORAL') return n.category === 'PASTORAL' || n.category === 'BIRTHDAY';
    if (activeFilter === 'SYSTEM') return n.category !== 'PASTORAL' && n.category !== 'BIRTHDAY';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BIRTHDAY':
        return <Cake className="w-5 h-5 text-danger" />;
      case 'PASTORAL':
        return <Sparkles className="w-5 h-5 text-warning" />;
      case 'MARATHON':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'EXAM':
        return <Award className="w-5 h-5 text-purple-400" />;
      case 'ATTENDANCE':
        return <CalendarCheck className="w-5 h-5 text-success" />;
      default:
        return <Bell className="w-5 h-5 text-gold" />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
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
            <div className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center shadow-md">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-content">مركز الإشعارات</h1>
              <span className="text-xs text-content-muted">
                {unreadCount > 0 ? `لديك ${unreadCount} إشعار جديد غير مقروء` : 'جميع الإشعارات مقروءة ومحدثة'}
              </span>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nav border border-line hover:border-gold/50 text-xs font-bold text-gold transition-all"
            >
              <Check className="w-4 h-4" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Filters Tabs */}
        <div className="flex items-center gap-2 mb-4 p-1.5 bg-canvas rounded-2xl border border-line overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'ALL'
                ? 'bg-gold text-brand-on font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            الكل ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('UNREAD')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'UNREAD'
                ? 'bg-gold text-brand-on font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            غير المقروءة ({unreadCount})
          </button>
          <button
            onClick={() => setActiveFilter('PASTORAL')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'PASTORAL'
                ? 'bg-gold text-brand-on font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            الرعاية والافتقاد
          </button>
          <button
            onClick={() => setActiveFilter('SYSTEM')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === 'SYSTEM'
                ? 'bg-gold text-brand-on font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            تنبيهات النظام
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-content-muted">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            جاري تحميل الإشعارات...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 rounded-3xl bg-canvas border border-line text-center">
            <Bell className="w-12 h-12 text-content-muted mx-auto mb-3" />
            <h4 className="text-base font-black text-content">لا توجد إشعارات هنا</h4>
            <p className="text-xs text-content-muted mt-1">ستصلك هنا كافة رسائل الافتقاد والتنبيهات المدرسية</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                  if (notif.action_url?.startsWith('/') && !notif.action_url.startsWith('//')) router.push(notif.action_url);
                }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  notif.is_read
                    ? 'bg-canvas/80 border-line/80 hover:border-line'
                    : 'bg-gradient-to-l from-canvas via-canvas to-canvas border-gold/40 shadow-lg shadow-gold/5 hover:border-gold'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    notif.is_read
                      ? 'bg-nav border-line'
                      : 'bg-gold/15 border-gold/30 shadow-inner'
                  }`}
                >
                  {getNotificationIcon(notif.category)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-black ${notif.is_read ? 'text-content' : 'text-gold'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-content-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.created_at).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-content-secondary mt-1 leading-relaxed">{notif.body}</p>

                  {notif.action_url && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-gold">
                      <span>انقر للانتقال</span>
                      <ArrowRight className="w-3.5 h-3.5 -rotate-180" />
                    </div>
                  )}
                </div>

                {!notif.is_read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-gold shrink-0 mt-1.5 shadow-md shadow-gold/50 animate-pulse" />
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
