"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  UserPlus,
  AlertCircle,
  X,
} from "lucide-react";

interface Notification {
  id: string;
  type: "post_published" | "approval_needed" | "member_invited" | "alert";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [];

const ICON_MAP = {
  post_published: Check,
  approval_needed: Megaphone,
  member_invited: UserPlus,
  alert: AlertCircle,
};

const ICON_COLOR_MAP = {
  post_published: "text-green-400 bg-green-500/20",
  approval_needed: "text-amber-400 bg-amber-500/20",
  member_invited: "text-blue-400 bg-blue-500/20",
  alert: "text-red-400 bg-red-500/20",
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-400 hover:text-white hover:bg-slate-800"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 p-3">
              <h3 className="text-sm font-medium text-white">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={markAllRead}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 mb-3">
                    <Bell className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">
                    No notifications
                  </p>
                  <p className="text-xs text-slate-400 text-center">
                    You&apos;re all caught up! Notifications about your posts and
                    team activity will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = ICON_MAP[notification.type];
                  const colorClass = ICON_COLOR_MAP[notification.type];
                  return (
                    <button
                      key={notification.id}
                      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-slate-700/50 transition-colors ${
                        !notification.read ? "bg-slate-700/20" : ""
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${!notification.read ? "font-medium text-white" : "text-slate-300"}`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {notification.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {notification.time}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-slate-700 p-2">
                <Button
                  variant="ghost"
                  className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  View All Notifications
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
