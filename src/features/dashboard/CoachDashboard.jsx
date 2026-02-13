import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    CheckCircle,
    Clock,
    ChevronLeft,
    Heart,
    CalendarDays,
    Target,
    Check
} from 'lucide-react';
import Button from '../../components/ui/Button';
import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import useEventsStore from '../../stores/eventsStore'; // NEW
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import TrainingDetailsModal from './TrainingDetailsModal';
import MonthlyOutstandingCard from './MonthlyOutstandingCard';
import styles from './CoachDashboard.module.css';

function CoachDashboard() {
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, getTrainingsByDate, editTraining } = useTrainingsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { events, fetchEvents } = useEventsStore(); // NEW
    const { fetchTheme, currentTheme } = useMonthlyThemesStore();
    const navigate = useNavigate();

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 17) return 'צהריים טובים';
        if (hour < 21) return 'ערב טוב';
        return 'לילה טוב';
    };

    useEffect(() => {
        if (userData?.id) {
            // Fetch groups for this coach
            fetchGroups(userData.id);

            // Fetch trainings for this week
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
            fetchTrainings(userData.id, startOfWeek, endOfWeek);

            // Fetch Events (Current Month + Next if week overlaps)
            fetchEvents(today.getFullYear(), today.getMonth());
            if (endOfWeek.getMonth() !== today.getMonth()) {
                fetchEvents(endOfWeek.getFullYear(), endOfWeek.getMonth());
            }
        }
    }, [userData, fetchTrainings, fetchGroups, fetchEvents]);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        fetchTheme(currentYear, currentMonth);
    }, [fetchTheme]);

    // Calculate real stats
    const stats = useMemo(() => {
        const groupCount = groups.length;
        const trainingsThisWeek = trainings.length;
        const completed = trainings.filter(t => t.status === 'completed').length;
        const pending = trainings.filter(t => t.status !== 'completed').length;

        // Define navigation paths for each stat
        return [
            { icon: Users, label: 'קבוצות', value: groupCount, color: 'blue', path: '/groups' },
            { icon: Calendar, label: 'אימונים השבוע', value: trainingsThisWeek, color: 'yellow', path: '/weekly-schedule' },
            { icon: CheckCircle, label: 'בוצעו', value: completed, color: 'green', path: '/weekly-completed' },
            { icon: Clock, label: 'ממתינים', value: pending, color: 'purple', path: '/weekly-pending' },
        ];
    }, [groups, trainings]);

    const todayEvents = useMemo(() => {
        const today = new Date();
        return events.filter(e => {
            const d = e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date);
            // Verify valid date
            if (!d || isNaN(d)) return false;
            return d.getDate() === today.getDate() &&
                d.getMonth() === today.getMonth() &&
                d.getFullYear() === today.getFullYear();
        });
    }, [events]);

    const todayTrainings = useMemo(() => {
        const today = new Date();
        return getTrainingsByDate(today).map(t => {
            const group = groups.find(g => g.id === t.groupId);
            return {
                id: t.id,
                time: t.date ? t.date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '--:--',
                duration: `${t.durationMinutes || 60} דק'`,
                group: group?.name || t.groupName || 'קבוצה',
                location: t.location || 'מגרש ראשי',
                status: t.status || 'planned',
                groupId: t.groupId // Keep original ID for lookup
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getTrainingsByDate, trainings, groups]);

    const weeklyTrainings = useMemo(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        return trainings
            .filter(t => {
                if (!t.date) return false;
                const tDate = new Date(t.date);
                return tDate > today;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(t => {
                const group = groups.find(g => g.id === t.groupId);
                return {
                    id: t.id,
                    day: t.date.toLocaleDateString('he-IL', { weekday: 'long' }),
                    time: t.date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
                    duration: `${t.durationMinutes || 60} דק'`,
                    group: group?.name || t.groupName || 'קבוצה',
                    location: t.location || 'מגרש ראשי',
                    status: t.status || 'planned',
                    groupId: t.groupId
                };
            });
    }, [trainings, groups]);

    const monthlyValues = useMemo(() => {
        if (currentTheme?.values && currentTheme.values.length > 0) {
            return currentTheme.values.map((val, i) => ({ id: `v-${i}`, name: val }));
        }

        // Default values if no theme defined
        return [
            { id: '1', name: 'התמדה' },
            { id: '2', name: 'משמעת עצמית' },
            { id: '3', name: 'כבוד' },
        ];
    }, [currentTheme]);

    const monthlyGoals = useMemo(() => {
        if (currentTheme?.goals && currentTheme.goals.length > 0) {
            return currentTheme.goals.map((g, i) => ({ id: `g-${i}`, name: g }));
        }
        // Default goals examples
        return [
            { id: 'g-def-1', name: 'שיפור משחק רשת' },
            { id: 'g-def-2', name: 'עבודת רגליים' },
            { id: 'g-def-3', name: 'יציבות בהגשה' },
        ];
    }, [currentTheme]);

    const [selectedTraining, setSelectedTraining] = useState(null);

    const handleTrainingClick = (training) => {
        // Hydrate full training details for the modal
        // Find full object from store or construct it
        const original = trainings.find(t => t.id === training.id);
        const fullDetails = {
            ...original,
            ...training, // Override UI formatted props
            group: training.group || original?.groupName || 'קבוצה',
            description: original?.description
        };
        setSelectedTraining(fullDetails);
    };

    const handleStatusToggle = async (e, trainingId, currentStatus) => {
        e.preventDefault();
        e.stopPropagation();

        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';

        // Optimistic update logic could be here, but store handles it well
        await editTraining(trainingId, { status: newStatus });
    };

    return (
        <div className={styles.page}>
            {/* Greeting */}
            <div className={styles.greeting}>
                <h1 className={styles.greetingTitle}>
                    {getGreeting()}, {(userData?.displayName || userData?.name || 'מאמן').split(' ')[0]}! 👋
                </h1>
            </div>

            {/* Monthly Outstanding */}
            <MonthlyOutstandingCard />

            {/* Monthly Values */}
            {/* Monthly Themes Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Monthly Values */}
                <div className={styles.valuesCard}>
                    <div className={styles.valuesTitle} style={{ color: 'var(--primary-700)' }}>
                        <Heart size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                        ערכי החודש
                    </div>
                    <div className={styles.valuesContent}>
                        {monthlyValues.map((value) => (
                            <span key={value.id} className={styles.valueTag}>
                                {value.name}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Monthly Goals */}
                <div className={styles.valuesCard}>
                    <div className={styles.valuesTitle} style={{ color: 'var(--accent-600)' }}>
                        <Target size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                        מטרות החודש
                    </div>
                    <div className={styles.valuesContent}>
                        {monthlyGoals.length > 0 ? monthlyGoals.map((goal) => (
                            <span key={goal.id} className={styles.valueTag} style={{
                                backgroundColor: 'var(--accent-50)',
                                color: 'var(--accent-700)',
                                borderColor: 'var(--accent-200)'
                            }}>
                                {goal.name}
                            </span>
                        )) : (
                            <span className={styles.valueTag} style={{ background: 'none', color: 'var(--text-tertiary)', padding: 0 }}>
                                לא הוגדרו מטרות
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid} style={{ marginTop: 'var(--space-6)' }}>
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={styles.statCard}
                        onClick={() => navigate(stat.path)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={`${styles.statIcon} ${styles[stat.color]}`}>
                            <stat.icon size={20} />
                        </div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{stat.value}</div>
                            <div className={styles.statLabel}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Today's Trainings */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <CalendarDays size={20} style={{ display: 'inline', marginLeft: '8px' }} />
                        אימוני היום
                    </h2>
                    <Link to="/calendar" className={styles.sectionAction}>
                        תכנית אימון מלאה
                        <ChevronLeft size={16} style={{ display: 'inline' }} />
                    </Link>
                </div>

                {/* Events Section - NEW */}
                {todayEvents.length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {todayEvents.map(event => (
                            <div key={event.id} style={{
                                padding: '12px',
                                borderRadius: '12px',
                                backgroundColor: event.type === 'holiday' ? '#FEF2F2' : '#FFFBEB',
                                border: `1px solid ${event.type === 'holiday' ? '#FEE2E2' : '#FEF3C7'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: event.type === 'holiday' ? '#DC2626' : '#D97706',
                                fontWeight: '600',
                                fontSize: '0.95rem'
                            }}>
                                <Target size={18} />
                                {event.title}
                            </div>
                        ))}
                    </div>
                )}

                {todayTrainings.length > 0 ? (
                    <div className={styles.todayList}>
                        {todayTrainings.map((training) => (
                            <div
                                key={training.id}
                                className={styles.trainingItem}
                                onClick={() => handleTrainingClick(training)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={styles.trainingTime}>
                                    <span className={styles.trainingTimeValue}>{training.time}</span>
                                    <span className={styles.trainingTimeDuration}>{training.duration}</span>
                                </div>
                                <div className={styles.trainingDetails}>
                                    <div className={styles.trainingGroup}>{training.group}</div>
                                    <div className={styles.trainingMeta}>{training.location}</div>
                                </div>
                                <button
                                    className={`${styles.trainingStatus} ${training.status === 'completed' ? styles.completed : ''}`}
                                    onClick={(e) => handleStatusToggle(e, training.id, training.status)}
                                    title={training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                                >
                                    {training.status === 'completed' ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <CheckCircle size={20} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <CalendarDays className={styles.emptyIcon} />
                        <p className={styles.emptyText}>אין אימונים מתוכננים להיום</p>
                        <Link to="/trainings/new">
                            <Button variant="outline">
                                הוסף אימון
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Weekly Trainings */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Calendar size={20} style={{ display: 'inline', marginLeft: '8px' }} />
                        המשך השבוע
                    </h2>
                </div>

                {weeklyTrainings.length > 0 ? (
                    <div className={styles.todayList}>
                        {weeklyTrainings.map((training) => (
                            <div
                                key={training.id}
                                className={styles.trainingItem}
                                onClick={() => handleTrainingClick(training)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={styles.trainingTime} style={{ minWidth: '60px' }}>
                                    <span className={styles.trainingTimeValue} style={{ fontSize: '0.9rem' }}>{training.day}</span>
                                    <span className={styles.trainingTimeDuration}>{training.time}</span>
                                </div>
                                <div className={styles.trainingDetails}>
                                    <div className={styles.trainingGroup}>{training.group}</div>
                                    <div className={styles.trainingMeta}>{training.location}</div>
                                </div>
                                <button
                                    className={`${styles.trainingStatus} ${training.status === 'completed' ? styles.completed : ''}`}
                                    onClick={(e) => handleStatusToggle(e, training.id, training.status)}
                                    title={training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                                >
                                    {training.status === 'completed' ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <CheckCircle size={20} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState} style={{ padding: 'var(--space-6) var(--space-4)' }}>
                        <p className={styles.emptyText} style={{ marginBottom: 0 }}>אין אימונים נוספים השבוע</p>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <TrainingDetailsModal
                isOpen={!!selectedTraining}
                training={selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />
        </div>
    );
}

export default CoachDashboard;
