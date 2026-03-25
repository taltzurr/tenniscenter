import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, CalendarDays, CalendarCheck, UserCog, Target } from 'lucide-react';
import useAuthStore from '../../../stores/authStore';
import { ROLES } from '../../../config/constants';
import styles from './BottomNav.module.css';

function BottomNav() {
    const { userData } = useAuthStore();

    // Get navigation items based on role
    const getNavItems = () => {
        // Center Manager navigation
        if (userData?.role === ROLES.CENTER_MANAGER) {
            return [
                { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
                { to: '/users', icon: UserCog, label: 'מאמנים' },
                { to: '/groups', icon: Users, label: 'קבוצות' },
                { to: '/goals', icon: Target, label: 'מטרות וערכים' },
            ];
        }

        // Supervisor navigation
        if (userData?.role === ROLES.SUPERVISOR) {
            return [
                { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
                { to: '/monthly-plans/review', icon: CalendarDays, label: 'אישור תכניות' },
                { to: '/goals', icon: Target, label: 'מטרות וערכים' },
                { to: '/users', icon: UserCog, label: 'משתמשים' },
            ];
        }

        // Coach navigation
        return [
            { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
            { to: '/weekly-schedule', icon: CalendarDays, label: 'לוז אימונים' },
            { to: '/calendar', icon: Calendar, label: 'בניית תכנית' },
            { to: '/goals', icon: Target, label: 'מטרות וערכים' },
        ];
    };

    const navItems = getNavItems();

    return (
        <nav className={styles.bottomNav}>
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `${styles.navItem} ${isActive ? styles.active : ''}`
                    }
                >
                    <span className={styles.navIcon}>
                        <item.icon size={22} />
                    </span>
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}

export default BottomNav;
