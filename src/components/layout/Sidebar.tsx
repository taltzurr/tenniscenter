/**
 * Sidebar Component
 * Desktop navigation sidebar
 */

import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  House,
  CalendarBlank,
  Users,
  Barbell,
  Gear,
  ChartBar,
  Buildings,
  ClipboardText,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  // Coach items
  {
    label: 'דשבורד',
    path: '/coach',
    icon: <House size={22} />,
    roles: ['coach'],
  },
  {
    label: 'יומן אימונים',
    path: '/coach/trainings',
    icon: <CalendarBlank size={22} />,
    roles: ['coach'],
  },
  {
    label: 'הקבוצות שלי',
    path: '/coach/groups',
    icon: <Users size={22} />,
    roles: ['coach'],
  },
  {
    label: 'תרגילים',
    path: '/coach/exercises',
    icon: <Barbell size={22} />,
    roles: ['coach'],
  },
  {
    label: 'תוכנית חודשית',
    path: '/coach/monthly-plan',
    icon: <ClipboardText size={22} />,
    roles: ['coach'],
  },

  // Center Manager items
  {
    label: 'דשבורד',
    path: '/center',
    icon: <House size={22} />,
    roles: ['center_manager'],
  },
  {
    label: 'לוח שנה',
    path: '/center/calendar',
    icon: <CalendarBlank size={22} />,
    roles: ['center_manager'],
  },
  {
    label: 'מאמנים',
    path: '/center/coaches',
    icon: <Users size={22} />,
    roles: ['center_manager'],
  },
  {
    label: 'קבוצות',
    path: '/center/groups',
    icon: <Users size={22} />,
    roles: ['center_manager'],
  },

  // Supervisor items
  {
    label: 'דשבורד',
    path: '/admin',
    icon: <ChartBar size={22} />,
    roles: ['supervisor'],
  },
  {
    label: 'מרכזים',
    path: '/admin/centers',
    icon: <Buildings size={22} />,
    roles: ['supervisor'],
  },
  {
    label: 'מאמנים',
    path: '/admin/coaches',
    icon: <Users size={22} />,
    roles: ['supervisor'],
  },
  {
    label: 'תרגילים',
    path: '/admin/exercises',
    icon: <Barbell size={22} />,
    roles: ['supervisor'],
  },
  {
    label: 'הגדרות',
    path: '/admin/settings',
    icon: <Gear size={22} />,
    roles: ['supervisor'],
  },
];

export function Sidebar() {
  const { user } = useAuth();

  const filteredItems = navItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100">
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-100">
        <img
          src="/logo.png"
          alt="מרכזי הטניס"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <h1 className="font-bold text-slate-800">מרכזי הטניס</h1>
          <p className="text-xs text-slate-500">ניהול אימונים</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/coach' || item.path === '/center' || item.path === '/admin'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-semibold">
              {user?.displayName?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
