import { NavLink, useNavigate } from 'react-router-dom';
import {
    X,
    LayoutDashboard,
    Users,
    Calendar,
    CalendarDays,
    CalendarCheck,
    CalendarRange,
    Dumbbell,
    MessageSquarePlus,
    Target,
    Building2,
    UserCog,
    Settings,
    LogOut
} from 'lucide-react';
import Avatar from '../../ui/Avatar';
import useAuthStore from '../../../stores/authStore';
import useUIStore from '../../../stores/uiStore';
import { ROLES } from '../../../config/constants';
import styles from './Sidebar.module.css';

const ROLE_LABELS = {
    [ROLES.SUPERVISOR]: 'מנהל מקצועי',
    [ROLES.CENTER_MANAGER]: 'מנהל מרכז',
    [ROLES.COACH]: 'מאמן',
};

function Sidebar() {
    const { userData, logout } = useAuthStore();
    const { isSidebarOpen, closeSidebar } = useUIStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        closeSidebar();
        navigate('/login');
    };

    const handleNavClick = () => {
        closeSidebar();
    };

    // Navigation items based on role
    const getNavItems = () => {
        // Center Manager navigation
        if (userData?.role === ROLES.CENTER_MANAGER) {
            return [
                {
                    section: 'ראשי',
                    items: [
                        { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
                        { to: '/users', icon: UserCog, label: 'מאמנים' },
                        { to: '/groups', icon: Users, label: 'קבוצות' },
                        { to: '/weekly-schedule', icon: CalendarDays, label: 'לוז אימונים' },
                    ]
                },
                {
                    section: 'ניהול',
                    items: [
                        { to: '/monthly-plans/review', icon: CalendarCheck, label: 'תוכניות' },
                        { to: '/events-calendar', icon: Target, label: 'מטרות וערכים' },
                        { to: '/events-calendar#calendar', icon: CalendarRange, label: 'לוח אירועים' },
                        { to: '/settings', icon: Settings, label: 'הגדרות' },
                    ]
                }
            ];
        }

        // Supervisor navigation
        if (userData?.role === ROLES.SUPERVISOR) {
            return [
                {
                    section: 'ראשי',
                    items: [
                        { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
                        { to: '/weekly-schedule', icon: CalendarDays, label: 'לוז אימונים' },
                    ]
                },
                {
                    section: 'ניהול',
                    items: [
                        { to: '/events-calendar', icon: Target, label: 'מטרות וערכים' },
                        { to: '/events-calendar#calendar', icon: CalendarRange, label: 'לוח אירועים' },
                        { to: '/monthly-plans/review', icon: CalendarCheck, label: 'אישור תכניות' },
                        { to: '/exercises', icon: Dumbbell, label: 'תרגילים' },
                        { to: '/exercise-requests', icon: MessageSquarePlus, label: 'בקשות תרגילים' },
                    ]
                },
                {
                    section: 'ניהול מערכת',
                    items: [
                        { to: '/centers', icon: Building2, label: 'מרכזים' },
                        { to: '/users', icon: UserCog, label: 'משתמשים' },
                        { to: '/settings', icon: Settings, label: 'הגדרות' },
                    ]
                }
            ];
        }

        // Coach navigation
        const items = [
            {
                section: 'ראשי',
                items: [
                    { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
                    { to: '/weekly-schedule', icon: CalendarDays, label: 'לוז אימונים' },
                    { to: '/calendar', icon: Calendar, label: 'בניית תכנית אימון' },
                ]
            },
            {
                section: 'ניהול',
                items: [
                    { to: '/groups', icon: Users, label: 'קבוצות' },
                    { to: '/exercises', icon: Dumbbell, label: 'תרגילים' },
                    { to: '/settings', icon: Settings, label: 'הגדרות' },
                ]
            }
        ];

        return items;
    };

    return (
        <>
            <div
                className={`${styles.overlay} ${isSidebarOpen ? styles.open : ''}`}
                onClick={closeSidebar}
            />

            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <div
                        className={styles.logo}
                        onClick={() => {
                            navigate('/dashboard');
                            closeSidebar();
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src="/logo.png"
                            alt="מרכזי הטניס"
                            className={styles.logoImage}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className={styles.logoText}>מרכזי הטניס</span>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={closeSidebar}
                        aria-label="סגור תפריט"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {getNavItems().map((section) => (
                        <div key={section.section} className={styles.navSection}>
                            <div className={styles.navSectionTitle}>{section.section}</div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={`${item.to}-${item.label}`}
                                    to={item.to}
                                    onClick={handleNavClick}
                                    className={({ isActive }) =>
                                        `${styles.navItem} ${isActive ? styles.active : ''}`
                                    }
                                >
                                    <span className={styles.navIcon}>
                                        <item.icon size={20} />
                                    </span>
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className={styles.footer}>
                    <div
                        className={styles.userInfo}
                        onClick={() => {
                            navigate('/settings');
                            closeSidebar();
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Avatar
                            name={userData?.displayName}
                            src={userData?.avatarUrl}
                            size="medium"
                        />
                        <div className={styles.userDetails}>
                            <div className={styles.userName}>{userData?.displayName}</div>
                            <div className={styles.userRole}>
                                {ROLE_LABELS[userData?.role] || userData?.role}
                            </div>
                        </div>
                    </div>

                    <button className={styles.logoutButton} onClick={handleLogout}>
                        <LogOut size={18} />
                        התנתק
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
