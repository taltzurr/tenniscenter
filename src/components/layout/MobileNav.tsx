/**
 * Mobile Navigation Component
 * Bottom navigation for mobile devices (Tiimo style - minimal)
 */

import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  House,
  CalendarBlank,
  Plus,
  User,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  iconFilled?: React.ReactNode;
  isAction?: boolean;
}

export function MobileNav() {
  const { user } = useAuth();

  // Get base path for user role
  const basePath = user?.role === 'supervisor'
    ? '/admin'
    : user?.role === 'center_manager'
      ? '/center'
      : '/coach';

  const navItems: NavItem[] = [
    {
      label: 'היום',
      path: basePath,
      icon: <House size={24} weight="regular" />,
      iconFilled: <House size={24} weight="fill" />,
    },
    {
      label: 'יומן',
      path: `${basePath}/trainings`,
      icon: <CalendarBlank size={24} weight="regular" />,
      iconFilled: <CalendarBlank size={24} weight="fill" />,
    },
    {
      label: 'חדש',
      path: `${basePath}/trainings/new`,
      icon: <Plus size={24} weight="bold" />,
      isAction: true,
    },
    {
      label: 'פרופיל',
      path: `${basePath}/profile`,
      icon: <User size={24} weight="regular" />,
      iconFilled: <User size={24} weight="fill" />,
    },
  ];

  return (
    <nav className="bg-white border-t border-slate-100 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === basePath}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center min-w-[64px] h-14 rounded-2xl transition-all duration-200',
                item.isAction
                  ? 'bg-primary-500 text-white shadow-md -mt-4'
                  : isActive
                    ? 'text-primary-500'
                    : 'text-slate-400 hover:text-slate-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={item.isAction ? 'p-2' : ''}>
                  {isActive && item.iconFilled ? item.iconFilled : item.icon}
                </span>
                {!item.isAction && (
                  <span className="text-[10px] mt-0.5 font-medium">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
