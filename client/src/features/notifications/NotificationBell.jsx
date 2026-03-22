import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from './notificationApi';

const TYPE_COLORS = {
  order_update: 'bg-blue-500',
  delivery_update: 'bg-[#FC8019]',
  system: 'bg-[#7E808C]',
  promotion: 'bg-[#60B246]',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const { data: countData } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });
  const { data: notifData } = useGetNotificationsQuery({ limit: 20 }, { skip: !open });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const unreadCount = countData?.unreadCount || 0;
  const notifications = notifData?.notifications || [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (notif) => {
    if (!notif.isRead) await markAsRead(notif._id);
    setOpen(false);
    if (notif.orderId) navigate(`/orders/${notif.orderId}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-[#F1F1F6] text-[#1C1C1C] transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#E23744] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-[8px] shadow-md border border-[#E0E0E0] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0]">
            <h4 className="text-sm font-semibold text-[#1C1C1C]">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-[#E23744] hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#7E808C]">
                No notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#F1F1F6] border-b border-[#E0E0E0] last:border-0 transition-colors ${
                    !notif.isRead ? 'bg-[#fff8f8]' : ''
                  }`}
                >
                  <div
                    className={`w-1 self-stretch rounded-full shrink-0 ${
                      TYPE_COLORS[notif.type] || 'bg-[#7E808C]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.isRead ? 'font-semibold text-[#1C1C1C]' : 'text-[#1C1C1C]'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-[#7E808C] mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-[#7E808C] mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-[#E23744] rounded-full mt-1 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
