import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Calendar, Settings, ShieldCheck, BarChart2, Trophy, Heart, Target } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import MonthlyOutstandingCard from './MonthlyOutstandingCard';
import { DEFAULT_GROUP_TYPES } from '../../config/constants';
import styles from './ManagerDashboard.module.css';

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const { userData, isSupervisor } = useAuthStore();
    const { fetchTheme, currentTheme } = useMonthlyThemesStore();

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        fetchTheme(currentYear, currentMonth);
    }, [fetchTheme]);

    const monthlyValues = useMemo(() => {
        if (currentTheme?.values && currentTheme.values.length > 0) {
            return currentTheme.values.map((val, i) => ({ id: `v-${i}`, name: val }));
        }
        return [];
    }, [currentTheme]);

    // Goals can be stored as { groupTypeId: string } (old format) or string[] (new format from assignments)
    const monthlyGoalsByGroup = useMemo(() => {
        const goals = currentTheme?.goals;
        if (!goals) return {};
        if (Array.isArray(goals)) return {};  // Array format handled by monthlyGoalsArray
        return goals;
    }, [currentTheme]);

    // Goals as flat array (new assignment format)
    const monthlyGoalsArray = useMemo(() => {
        const goals = currentTheme?.goals;
        if (!goals || !Array.isArray(goals)) return [];
        return goals.map((g, i) => ({ id: `g-${i}`, name: g }));
    }, [currentTheme]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 17) return 'צהריים טובים';
        if (hour < 21) return 'ערב טוב';
        return 'לילה טוב';
    };

    // Navigation cards ordered by daily relevance (UX: daily ops first, recognition last)
    const dashboardItems = useMemo(() => {
        const items = [
            {
                title: 'ניהול משתמשים',
                description: 'צפייה, הוספה ועריכה של משתמשים, מאמנים ומנהלים במערכת.',
                icon: Users,
                color: 'blue',
                path: '/users'
            },
            // Show "Center Management" only to supervisors
            ...(isSupervisor() ? [{
                title: 'ניהול מרכזים',
                description: 'הגדרת מרכזים, כתובות ופרטי התקשרות.',
                icon: Building2,
                color: 'green',
                path: '/centers'
            }] : []),
            {
                title: 'פיקוח ובקרה (אנליטיקה)',
                description: 'דוחות ביצוע, סטטיסטיקות מאמנים ומעקב אחר השלמת אימונים.',
                icon: BarChart2,
                color: 'orange',
                path: '/analytics'
            },
            {
                title: 'מטרות וערכים',
                description: 'הגדרת מטרות חודשיות לפי סוג קבוצה, ערכים ולוח אירועים ארגוני.',
                icon: Calendar,
                color: 'purple',
                path: '/events-calendar'
            },
            {
                title: 'מצטייני החודש',
                description: 'בחירת מאמנים ומרכזים מצטיינים בכל חודש.',
                icon: Trophy,
                color: 'yellow',
                path: '/monthly-outstanding'
            }
        ];
        return items;
    }, [isSupervisor]);

    return (
        <div className={styles.page}>
            <header className={styles.greeting}>
                <h1 className={styles.greetingTitle}>
                    {getGreeting()}, {userData?.displayName || 'מנהל'}!
                </h1>
            </header>

            {/* Monthly Context (Goals by group type + Values for all) */}
            <div className={styles.contextGrid}>
                {/* Goals by group type */}
                <div className={styles.dashboardCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.contextTitle} style={{ color: 'var(--accent-700)' }}>
                            <Target size={18} />
                            מטרות החודש
                        </div>
                    </div>
                    <div className={styles.goalsByGroup}>
                        {/* New format: goals as flat array from assignments */}
                        {monthlyGoalsArray.length > 0 ? (
                            <div className={styles.cardContent}>
                                {monthlyGoalsArray.map((goal) => (
                                    <span key={goal.id} className={`${styles.tag} ${styles.tagGoal}`}>
                                        {goal.name}
                                    </span>
                                ))}
                            </div>
                        ) : Object.keys(monthlyGoalsByGroup).length > 0 ? (
                            /* Old format: goals keyed by group type */
                            DEFAULT_GROUP_TYPES.map((groupType) => {
                                const goal = monthlyGoalsByGroup[groupType.id];
                                if (!goal) return null;
                                return (
                                    <div key={groupType.id} className={styles.goalRow}>
                                        <span className={styles.goalGroupLabel}>{groupType.name}</span>
                                        <span className={styles.goalText}>{goal}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                                טרם הוגדרו מטרות לחודש זה
                            </span>
                        )}
                    </div>
                </div>

                {/* Values for all */}
                <div className={styles.dashboardCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.contextTitle} style={{ color: 'var(--primary-700)' }}>
                            <Heart size={18} />
                            ערכי החודש
                        </div>
                    </div>
                    <div className={styles.cardContent}>
                        {monthlyValues.length > 0 ? monthlyValues.map((value) => (
                            <span key={value.id} className={`${styles.tag} ${styles.tagValue}`}>
                                {value.name}
                            </span>
                        )) : (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                                טרם הוגדרו ערכים לחודש זה
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly Outstanding Widget */}
            <MonthlyOutstandingCard />

            <main>
                <h2 className={styles.sectionTitle}>
                    <ShieldCheck size={24} />
                    ניהול שוטף
                </h2>

                <div className={styles.grid}>
                    {dashboardItems.map((item, index) => (
                        <div
                            key={index}
                            className={styles.card}
                            onClick={() => navigate(item.path)}
                        >
                            <div className={`${styles.cardIcon} ${styles[item.color]}`}>
                                <item.icon size={24} />
                            </div>
                            <h3 className={styles.cardTitle}>{item.title}</h3>
                            <p className={styles.cardDescription}>{item.description}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ManagerDashboard;
