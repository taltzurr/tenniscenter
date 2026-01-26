/**
 * App Layout
 * Main layout wrapper with navigation
 */

import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="lg:pr-64">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="pb-20 lg:pb-6">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation - shown only on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>
    </div>
  );
}
