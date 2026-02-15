import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Calendar, Settings, ShieldCheck, BarChart2, Trophy, Heart, Target } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import MonthlyOutstandingCard from './MonthlyOutstandingCard';
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

    const monthlyGoals = useMemo(() => {
        if (currentTheme?.goals && currentTheme.goals.length > 0) {
            return currentTheme.goals.map((g, i) => ({ id: `g-${i}`, name: g }));
        }
        return [];
    }, [currentTheme]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 17) return 'צהריים טובים';
        if (hour < 21) return 'ערב טוב';
        return 'לילה טוב';
    };

    // Filter dashboard items based on role
    // Center managers should not see "Center Management" - that's supervisor-only
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
                title: 'לוח אירועים ומטרות',
                description: 'ניהול לוח שנה ארגוני, אירועים מיוחדים ומטרות חודשיות.',
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
                <p className={styles.greetingSubtitle}>
                    ברוך הבא לממשק הניהול של הטניס סנטר.
                </p>
            </header>

            {/* Monthly Outstanding Widget */}
            <MonthlyOutstandingCard />

            {/* Monthly Context (Values & Goals) */}
            <div className={styles.contextGrid}>
                {/* Values */}
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

                {/* Goals */}
                <div className={styles.dashboardCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.contextTitle} style={{ color: 'var(--accent-700)' }}>
                            <Target size={18} />
                            מטרות החודש
                        </div>
                    </div>
                    <div className={styles.cardContent}>
                        {monthlyGoals.length > 0 ? monthlyGoals.map((goal) => (
                            <span key={goal.id} className={`${styles.tag} ${styles.tagGoal}`}>
                                {goal.name}
                            </span>
                        )) : (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                                טרם הוגדרו מטרות לחודש זה
                            </span>
                        )}
                    </div>
                </div>
            </div>

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
