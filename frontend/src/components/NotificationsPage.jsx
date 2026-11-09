import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { notificationApi } from '../services/notificationApi.js';
import { useSocket } from '../context/SocketContext.jsx';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  TableSkeleton,
  Toast,
  Modal,
} from './ui/DesignSystem.jsx';
import {
  Bell,
  CheckCheck,
  Filter,
  Trash2,
  ExternalLink,
  Settings,
  Clock,
  ClipboardList,
  Truck,
  IndianRupee,
  Building2,
  Sliders,
} from 'lucide-react';

const CATEGORY_ICONS = {
  order: ClipboardList,
  dispatch: Truck,
  driver: Truck,
  billing: IndianRupee,
  company: Building2,
  system: Bell,
};

const CATEGORY_COLORS = {
  order: 'primary',
  dispatch: 'teal',
  driver: 'teal',
  billing: 'warning',
  company: 'purple',
  system: 'default',
};

export default function NotificationsPage() {
  const { token, user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalCount: 0 });

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [toast, setToast] = useState({ type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: 'success', message: '' }), 4000);
  };

  const loadNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications(token, {
        category: selectedCategory,
        unreadOnly,
        page,
        limit: 20,
      });
      setNotifications(res.notifications || []);
      setPagination(res.pagination || { page: 1, limit: 20, totalPages: 1, totalCount: 0 });
    } catch (err) {
      showToast('error', err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await notificationApi.getPreferences(token);
      setPreferences(prefs);
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  };

  useEffect(() => {
    loadNotifications(1);
  }, [selectedCategory, unreadOnly]);

  // Real-time notification updates
  useEffect(() => {
    if (!socket) return;
    const handleNew = (data) => {
      if (data?.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setPagination((p) => ({ ...p, totalCount: p.totalCount + 1 }));
      }
    };
    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, [socket]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('success', 'All notifications marked as read.');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationApi.deleteNotification(token, id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast('success', 'Notification removed.');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      await notificationApi.updatePreferences(token, preferences);
      showToast('success', 'Notification preferences saved.');
      setSettingsModalOpen(false);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'order', label: 'Orders' },
    { id: 'dispatch', label: 'Dispatch' },
    { id: 'driver', label: 'Drivers' },
    { id: 'billing', label: 'Billing' },
    { id: 'company', label: 'Companies' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="space-y-6">
      <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: 'success', message: '' })} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Communication & Notifications
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Stay updated with orders, dispatch, and billing alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Sliders}
            onClick={() => {
              loadPreferences();
              setSettingsModalOpen(true);
            }}
          >
            Preferences
          </Button>
          <Button size="sm" variant="secondary" icon={CheckCheck} onClick={handleMarkAllAsRead}>
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedCategory === c.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#0E131F] text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-700 text-blue-600 bg-slate-900"
          />
          Unread only
        </label>
      </div>

      {/* Notifications List */}
      {loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications found"
          description="You're all caught up with your updates."
          icon={Bell}
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const IconComponent = CATEGORY_ICONS[n.category] || Bell;
            return (
              <div
                key={n._id}
                className={`flex items-start justify-between p-4 rounded-xl border transition ${
                  n.isRead
                    ? 'bg-[#0E131F] border-slate-800/60 opacity-80'
                    : 'bg-[#101726] border-blue-500/30 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComponent className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-100 truncate">{n.title}</p>
                      <Badge variant={CATEGORY_COLORS[n.category] || 'default'}>{n.category}</Badge>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-3">
                  {!n.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(n._id)}
                      title="Mark as read"
                    >
                      Read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => handleDelete(n._id)}
                    title="Dismiss"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Notification Preferences"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsModalOpen(false)}>Cancel</Button>
            <Button loading={savingPrefs} onClick={handleSavePreferences}>Save Preferences</Button>
          </>
        }
      >
        {preferences && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-200 mb-2">Delivery Channels</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 bg-[#06080D] rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-300">In-App Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.inAppEnabled}
                    onChange={(e) => setPreferences({ ...preferences, inAppEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                </label>
                <label className="flex items-center justify-between p-2.5 bg-[#06080D] rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-300">Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) => setPreferences({ ...preferences, emailEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-200 mb-2">Category Toggles</p>
              <div className="grid grid-cols-2 gap-2">
                {['orders', 'dispatch', 'driver', 'billing', 'company'].map((cat) => (
                  <label key={cat} className="flex items-center justify-between p-2.5 bg-[#06080D] rounded-lg border border-slate-800 text-xs capitalize">
                    <span className="text-slate-300">{cat}</span>
                    <input
                      type="checkbox"
                      checked={preferences.categories?.[cat] ?? true}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          categories: { ...preferences.categories, [cat]: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
