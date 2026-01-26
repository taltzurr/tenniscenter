/**
 * Header Component
 * Top header with user info and notifications
 */

import { Bell, SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'supervisor':
        return 'מנהל מקצועי';
      case 'center_manager':
        return 'מנהל מרכז';
      case 'coach':
        return 'מאמן';
      default:
        return '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-100">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Logo and title - mobile only */}
        <div className="flex items-center gap-3 lg:hidden">
          <img
            src="/logo.png"
            alt="מרכזי הטניס"
            className="w-10 h-10 rounded-full"
          />
          <span className="font-semibold text-slate-800">מרכזי הטניס</span>
        </div>

        {/* Desktop - greeting */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-slate-800">
            שלום, {user?.displayName}
          </h1>
          <p className="text-sm text-slate-500">{getRoleLabel(user?.role || '')}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative"
            aria-label="התראות"
          >
            <Bell size={24} />
            {/* Notification badge - will be dynamic */}
            {/* <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full" /> */}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="התנתקות"
          >
            <SignOut size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
