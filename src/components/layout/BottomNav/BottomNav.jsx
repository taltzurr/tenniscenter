import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, CalendarDays } from 'lucide-react';
import styles from './BottomNav.module.css';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
    { to: '/monthly-plans', icon: CalendarDays, label: 'לוז אימונים' },
    { to: '/calendar', icon: Calendar, label: 'בניית תכנית' },
    { to: '/groups', icon: Users, label: 'קבוצות' },
];

function BottomNav() {
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
