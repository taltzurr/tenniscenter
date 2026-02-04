import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, CalendarDays, UserCog } from 'lucide-react';
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
            ];
        }

        // Coach and Supervisor navigation (original)
        return [
            { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
            { to: '/monthly-plans', icon: CalendarDays, label: 'לוז אימונים' },
            { to: '/calendar', icon: Calendar, label: 'בניית תכנית' },
            { to: '/groups', icon: Users, label: 'קבוצות' },
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
