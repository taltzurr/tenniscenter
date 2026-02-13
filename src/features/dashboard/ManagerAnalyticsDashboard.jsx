import { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    BarChart2,
    CheckCircle,
    Clock,
    Users,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isSameMonth
} from 'date-fns';
import { he } from 'date-fns/locale';
import { getOrganizationTrainings } from '../../services/trainings';
import useAuthStore from '../../stores/authStore';
import useUsersStore from '../../stores/usersStore';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import CoachTrainingsModal from './CoachTrainingsModal';
import styles from './ManagerAnalyticsDashboard.module.css';

const ManagerAnalyticsDashboard = () => {
    const { userData, isSupervisor, isCenterManager } = useAuthStore();
    const { users, fetchUsers } = useUsersStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trainings, setTrainings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCoach, setSelectedCoach] = useState(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Get center coach IDs for filtering (center managers only)
    const centerCoachIds = useMemo(() => {
        if (isSupervisor() || !userData?.managedCenterId || !users || users.length === 0) return null;
        return users
            .filter(u => u.role === 'coach' && u.centerIds?.includes(userData.managedCenterId))
            .map(u => u.id);
    }, [users, userData?.managedCenterId, isSupervisor]);

    useEffect(() => {
        if (isCenterManager()) {
            fetchUsers();
        }
    }, [isCenterManager, fetchUsers]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch all trainings for the selected month
                let data = await getOrganizationTrainings(monthStart, monthEnd);

                // Center managers: filter to only their center's coaches
                if (!isSupervisor() && centerCoachIds) {
                    data = data.filter(t => centerCoachIds.includes(t.coachId));
                }

                setTrainings(data);
            } catch (error) {
                console.error("Failed to fetch analytics data", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Wait for centerCoachIds to be ready for center managers
        if (isSupervisor() || centerCoachIds !== null) {
            fetchData();
        }
    }, [currentDate, centerCoachIds, isSupervisor]);

    // Calculate Statistics
    const stats = useMemo(() => {
        const total = trainings.length;
        const completed = trainings.filter(t => t.status === 'completed').length;
        const pending = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const pendingRate = total > 0 ? 100 - completionRate : 0; // For Pie Chart

        // Group by Coach
        const coachMap = {};

        trainings.forEach(t => {
            const coachId = t.coachId || 'unknown';
            const coachName = t.coachName || 'מאמן לא ידוע';

            if (!coachMap[coachId]) {
                coachMap[coachId] = {
                    id: coachId,
                    name: coachName,
                    total: 0,
                    completed: 0
                };
            }

            coachMap[coachId].total += 1;
            if (t.status === 'completed') {
                coachMap[coachId].completed += 1;
            }
        });

        const coaches = Object.values(coachMap).map(c => ({
            ...c,
            pending: c.total - c.completed,
            rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
        })).sort((a, b) => b.total - a.total); // Sort by activity volume

        return {
            total,
            completed,
            pending,
            completionRate,
            coaches
        };
    }, [trainings]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    if (isLoading) return <Spinner.FullPage />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>דאשבורד פיקוח ובקרה</h1>
                    <p className={styles.subtitle}>
                        {isCenterManager() ? 'סקירה חודשית של ביצוע תוכניות האימון במרכז שלך' : 'סקירה חודשית של ביצוע תוכניות האימון בכל המרכזים'}
                    </p>
                </div>

                <div className={styles.monthSelector}>
                    <button onClick={handlePrevMonth} className={styles.actionButton}>
                        <ChevronRight size={20} />
                    </button>
                    <span className={styles.monthTitle}>
                        {format(currentDate, 'MMMM yyyy', { locale: he })}
                    </span>
                    <button onClick={handleNextMonth} className={styles.actionButton}>
                        <ChevronLeft size={20} />
                    </button>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>סה"כ אימונים שתוכננו</div>
                    <div className={styles.statValue}>{stats.total}</div>
                    <div className={styles.statTrend} style={{ color: 'var(--text-tertiary)' }}>
                        <BarChart2 size={12} />
                        יעד חודשי
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>אחוז ביצוע כללי</div>
                    <div className={styles.statValue} style={{ color: stats.completionRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                        {stats.completionRate}%
                    </div>
                    <div className={styles.statTrend}>
                        {stats.completionRate >= 80 ? (
                            <span className={styles.trendUp}><TrendingUp size={12} /> מצוין</span>
                        ) : (
                            <span className={styles.trendDown}><TrendingDown size={12} /> דרוש שיפור</span>
                        )}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>בוצעו בפועל</div>
                    <div className={styles.statValue}>{stats.completed}</div>
                    <div className={styles.statTrend} style={{ color: 'var(--success)' }}>
                        <CheckCircle size={12} />
                        הושלמו
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>טרם בוצעו / בוטלו</div>
                    <div className={styles.statValue}>{stats.pending}</div>
                    <div className={styles.statTrend} style={{ color: 'var(--text-tertiary)' }}>
                        <Clock size={12} />
                        ממתינים לדיווח
                    </div>
                </div>
            </div>

            <div className={styles.chartsSection}>
                {/* Pie Chart: Global Status */}
                <div className={`${styles.card} ${styles.pieCard}`}>
                    <h2 className={styles.cardTitle}>סטטוס ביצוע מרכזי</h2>
                    <div className={styles.pieChartContainer}>
                        {stats.total > 0 ? (
                            <>
                                <div
                                    className={styles.pieChart}
                                    style={{
                                        background: `conic-gradient(
                                            var(--success) 0% ${stats.completionRate}%,
                                            var(--gray-200) ${stats.completionRate}% 100%
                                        )`
                                    }}
                                />
                                <div className={styles.legend}>
                                    <div className={styles.legendItem}>
                                        <div className={styles.legendDot} style={{ background: 'var(--success)' }} />
                                        <span>בוצע ({stats.completed})</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={styles.legendDot} style={{ background: 'var(--gray-200)' }} />
                                        <span>טרם בוצע ({stats.pending})</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-tertiary)' }}>אין נתונים</div>
                        )}
                    </div>
                </div>

                {/* Coaches Table */}
                <div className={`${styles.card} ${styles.tableCard}`}>
                    <h2 className={styles.cardTitle}>ביצועים לפי מאמן</h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>מאמן</th>
                                    <th>יעד</th>
                                    <th>ביצוע</th>
                                    <th>אחוז</th>
                                    <th>סטטוס</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.coaches.map(coach => (
                                    <tr
                                        key={coach.id}
                                        onClick={() => setSelectedCoach(coach)}
                                        style={{ cursor: 'pointer' }}
                                        className={styles.tableRow} // You might want to add hover effect in CSS
                                    >
                                        <td>
                                            <div className={styles.coachName}>
                                                <Avatar name={coach.name} size="small" />
                                                {coach.name}
                                            </div>
                                        </td>
                                        <td>{coach.total}</td>
                                        <td>{coach.completed}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className={styles.progressBar}>
                                                    <div
                                                        className={styles.progressFill}
                                                        style={{
                                                            width: `${coach.rate}%`,
                                                            backgroundColor: coach.rate >= 80 ? 'var(--success)' : (coach.rate >= 50 ? 'var(--warning)' : 'var(--error)')
                                                        }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', minWidth: '30px' }}>{coach.rate}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: coach.rate >= 80 ? 'var(--success-bg)' : 'var(--bg-primary)',
                                                color: coach.rate >= 80 ? 'var(--success-dark)' : 'var(--text-secondary)'
                                            }}>
                                                {coach.rate >= 80 ? 'עומד ביעד' : 'דרוש מעקב'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stats.coaches.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                                            לא נמצאו נתונים לחודש זה
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <CoachTrainingsModal
                isOpen={!!selectedCoach}
                coach={selectedCoach}
                trainings={trainings}
                onClose={() => setSelectedCoach(null)}
            />
        </div>
    );
};

export default ManagerAnalyticsDashboard;
