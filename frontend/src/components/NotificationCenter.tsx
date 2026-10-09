'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BadgeService,
  DeepLinkService,
  PushNotificationService,
} from '@/lib/mobile';
import {
  Bell,
  HeartHandshake,
  Cake,
  BookOpen,
  Info,
  Check,
  CheckCheck,
  ChevronDown,
  Loader2,
  ExternalLink
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  recipient_id: string;
  category: 'PASTORAL' | 'BIRTHDAY' | 'DAILY_VERSE' | 'SYSTEM';
  title: string;
  body: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PASTORAL' | 'BIRTHDAY' | 'DAILY_VERSE'>('ALL');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let channel: any = null;

    async function setupNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      fetchNotifications(user.id);

      // Subscribe to Realtime channel for live notifications
      channel = supabase
        .channel(`user-notifications-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as NotificationItem;
            setNotifications((prev) => {
              const updated = [newNotif, ...prev];
              const unread = updated.filter((n) => !n.is_read).length;
              setUnreadCount(unread);
              void BadgeService.set(unread);
              return updated;
            });

            PushNotificationService.showForegroundNotification({
              title: newNotif.title,
              body: newNotif.body,
            });
          }
        )
        .subscribe();
    }

    setupNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchNotifications = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data as NotificationItem[]);
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
        void BadgeService.set(unread);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => {
      const next = Math.max(0, prev - 1);
      void BadgeService.set(next);
      return next;
    });

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (actionUrl) {
      setIsOpen(false);
      const route = DeepLinkService.parse(actionUrl);
      if (route && route.resourceType !== 'UNKNOWN') {
        const queryStr = route.queryParams && Object.keys(route.queryParams).length > 0
          ? '?' + new URLSearchParams(route.queryParams).toString()
          : '';
        router.push(route.canonicalPath + queryStr);
      } else if (actionUrl.startsWith('/')) {
        router.push(actionUrl);
      } else {
        router.push('/notifications');
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUserId || unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    void BadgeService.clear();

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', currentUserId)
      .eq('is_read', false);
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return new Date(isoString).toLocaleDateString('ar-EG');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PASTORAL':
        return <HeartHandshake className="w-4 h-4 text-rose-400" />;
      case 'BIRTHDAY':
        return <Cake className="w-4 h-4 text-amber-400" />;
      case 'DAILY_VERSE':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.category === filter;
  });

  return (
    <div className="relative" ref={containerRef} dir="rtl">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-card)] transition flex items-center justify-center w-9 h-9"
        title="الإشعارات"
      >
        <Bell className="w-4 h-4 text-[#C5A059]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-[var(--bg-nav)] shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Center Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 md:w-96 app-card-elevated shadow-2xl z-50 overflow-hidden font-sans border border-[var(--border-card)]">
          
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-input)]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#C5A059]" />
              <h3 className="font-bold text-[var(--text-primary)] text-sm">مركز الإشعارات</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7B0017]/10 border border-[#7B0017]/30 text-[#7B0017] dark:text-[#FA383E]">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-2 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] overflow-x-auto text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-full transition font-bold text-[11px] ${
                filter === 'ALL'
                  ? 'bg-[#7B0017] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('PASTORAL')}
              className={`px-3 py-1 rounded-full transition font-bold text-[11px] ${
                filter === 'PASTORAL'
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              افتقاد
            </button>
            <button
              onClick={() => setFilter('BIRTHDAY')}
              className={`px-3 py-1 rounded-full transition font-bold text-[11px] ${
                filter === 'BIRTHDAY'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              أعياد ميلاد
            </button>
            <button
              onClick={() => setFilter('DAILY_VERSE')}
              className={`px-3 py-1 rounded-full transition font-bold text-[11px] ${
                filter === 'DAILY_VERSE'
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              آيات يومية
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {loading ? (
              <div className="py-12 flex items-center justify-center text-[var(--text-muted)] gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#C5A059]" />
                <span className="text-xs">جاري تحديث الإشعارات...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-xs">
                لا توجد إشعارات جديدة حالياً
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.action_url)}
                  className={`p-3.5 hover:bg-[var(--bg-card-hover)] cursor-pointer transition flex gap-3 items-start ${
                    !n.is_read ? 'bg-[#7B0017]/5 border-r-2 border-r-[#7B0017]' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-card)] flex-shrink-0 mt-0.5">
                    {getCategoryIcon(n.category)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1 text-right">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold truncate ${!n.is_read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 font-mono">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>

                    {n.action_url && (
                      <div className="flex items-center gap-1 text-[10px] text-[#C5A059] pt-0.5 font-bold">
                        <ExternalLink className="w-3 h-3" />
                        عرض التفاصيل
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[var(--bg-input)] border-t border-[var(--border-subtle)] text-center">
            <span className="text-[10px] text-[var(--text-muted)]">
              يتم حفظ كافة الإشعارات بشكل دائم في حسابك
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
