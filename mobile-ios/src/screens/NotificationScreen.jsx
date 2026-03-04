import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, Clock, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';

dayjs.extend(relativeTime);

const NotificationScreen = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, refresh } = useNotifications();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-primary py-4 px-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4"
          >
            <ArrowLeft className="text-white" size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Notifikasi</h1>
          </div>
          <button
            onClick={refresh}
            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition text-white"
          >
            <Clock size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Belum ada notifikasi</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                notif.is_read 
                  ? 'bg-white border-gray-100 opacity-70' 
                  : 'bg-white border-primary/30 shadow-md shadow-primary/5'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold ${notif.is_read ? 'text-gray-700' : 'text-primary'}`}>
                  {notif.title}
                </h3>
                {!notif.is_read && (
                  <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                {notif.message}
              </p>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                <span className="flex items-center capitalize">
                  <Clock size={10} className="mr-1" />
                  {dayjs(notif.created_at).locale('id').fromNow()}
                </span>
                {notif.is_read && (
                  <span className="flex items-center text-emerald-500">
                    <Check size={10} className="mr-1" /> Dibaca
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationScreen;
