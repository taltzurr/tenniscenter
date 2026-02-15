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
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Button from '../../components/ui/Button';
import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import useEventsStore from '../../stores/eventsStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import TrainingDetailsModal from './TrainingDetailsModal';
import MonthlyOutstandingCard from './MonthlyOutstandingCard';
import UpcomingTrainingCard from './UpcomingTrainingCard';
import QuickStats from './QuickStats';
import styles from './CoachDashboard.module.css';

function CoachDashboard() {
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, getTrainingsByDate, editTraining } = useTrainingsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { events, fetchEvents } = useEventsStore();
    const { fetchTheme, currentTheme } = useMonthlyThemesStore();
    const navigate = useNavigate();

    const [selectedTraining, setSelectedTraining] = useState(null);
    const [valuesExpanded, setValuesExpanded] = useState(true);

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
            fetchGroups(userData.id);

            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
            fetchTrainings(userData.id, startOfWeek, endOfWeek);

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

    // Today's trainings
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
                groupId: t.groupId,
                rawDate: t.date
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getTrainingsByDate, trainings, groups]);

    // Upcoming (next) training = first non-completed training today sorted by time
    const upcomingTraining = useMemo(() => {
        const now = new Date();
        const upcoming = todayTrainings
            .filter(t => {
                if (!t.rawDate) return t.status !== 'completed';
                return t.rawDate >= now || t.status !== 'completed';
            })
            .sort((a, b) => {
                if (!a.rawDate || !b.rawDate) return 0;
                return a.rawDate - b.rawDate;
            });
        return upcoming[0] || null;
    }, [todayTrainings]);

    // Remaining today's trainings (exclude the hero card one)
    const remainingTodayTrainings = useMemo(() => {
        if (!upcomingTraining) return todayTrainings;
        return todayTrainings.filter(t => t.id !== upcomingTraining.id);
    }, [todayTrainings, upcomingTraining]);

    // Weekly trainings (future days only)
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

    // Contextual greeting subtitle
    const greetingContext = useMemo(() => {
        if (upcomingTraining && upcomingTraining.rawDate) {
            const now = new Date();
            const diff = upcomingTraining.rawDate - now;
            if (diff <= 0) {
                return 'אימון מתחיל עכשיו! ⚡';
            }
            const minutes = Math.round(diff / 60000);
            if (minutes < 60) {
                return `אימון מתחיל בקרוב! עוד ${minutes} דקות ⚡`;
            }
            const hours = Math.round(minutes / 60);
            return `יש לך אימון עוד ${hours === 1 ? 'שעה' : `${hours} שעות`} ⚡`;
        }
        if (todayTrainings.length > 0) {
            return `${todayTrainings.length} אימונים היום`;
        }
        return 'אין אימונים היום, יום מנוחה 🧘';
    }, [upcomingTraining, todayTrainings]);

    // Stats
    const stats = useMemo(() => {
        const groupCount = groups.length;
        const trainingsThisWeek = trainings.length;
        const completed = trainings.filter(t => t.status === 'completed').length;
        const pending = trainings.filter(t => t.status !== 'completed').length;

        return [
            { icon: Users, label: 'קבוצות', value: groupCount, color: 'blue', path: '/groups' },
            { icon: Calendar, label: 'אימונים השבוע', value: trainingsThisWeek, color: 'yellow', path: '/weekly-schedule' },
            { icon: CheckCircle, label: 'אימונים שבוצעו', value: completed, color: 'green', path: '/weekly-completed' },
            { icon: Clock, label: 'אימונים ממתינים', value: pending, color: 'orange', path: '/weekly-pending', attention: true },
        ];
    }, [groups, trainings]);

    // Today's events
    const todayEvents = useMemo(() => {
        const today = new Date();
        return events.filter(e => {
            const d = e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date);
            if (!d || isNaN(d)) return false;
            return d.getDate() === today.getDate() &&
                d.getMonth() === today.getMonth() &&
                d.getFullYear() === today.getFullYear();
        });
    }, [events]);

    // Monthly themes
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

    const handleTrainingClick = (training) => {
        const original = trainings.find(t => t.id === training.id);
        const fullDetails = {
            ...original,
            ...training,
            group: training.group || original?.groupName || 'קבוצה',
            description: original?.description
        };
        setSelectedTraining(fullDetails);
    };

    const handleStatusToggle = async (e, trainingId, currentStatus) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        await editTraining(trainingId, { status: newStatus });
    };

    const handleHeroConfirm = async (trainingId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        await editTraining(trainingId, { status: newStatus });
    };

    console.log("Layout Debug: Stats First - " + new Date().toISOString());

    return (
        <div className={styles.page}>
            {/* 1. Greeting with context */}
            <div className={`${styles.dashSection} ${styles.delay0}`}>
                <div className={styles.greeting}>
                    <h1 className={styles.greetingTitle}>
                        {getGreeting()}, {(userData?.displayName || userData?.name || 'מאמן').split(' ')[0]}! 👋
                    </h1>
                    <p className={styles.greetingSubtitle}>{greetingContext}</p>
                </div>
            </div>

            {/* 2. Quick Stats ("הריבועים") - MOVED TO TOP */}
            <div className={`${styles.dashSection} ${styles.delay1}`}>
                <QuickStats stats={stats} />
            </div>

            {/* 3. Today's Trainings ("אימוני היום") - Includes Hero & List */}
            <div className={`${styles.dashSection} ${styles.delay2}`}>
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

                {/* Hero Card */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <UpcomingTrainingCard
                        training={upcomingTraining}
                        nextTraining={weeklyTrainings[0] || null}
                        onConfirm={handleHeroConfirm}
                    />
                </div>

                {/* Today's Events */}
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

                {/* Remaining Trainings List */}
                {remainingTodayTrainings.length > 0 ? (
                    <div className={styles.todayList}>
                        {remainingTodayTrainings.map((training) => (
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

                                    {/* Plan Preview / Action */}
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--primary-600)',
                                            backgroundColor: 'var(--primary-50)',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontWeight: '500'
                                        }}>
                                            לצפייה בתוכנית ›
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className={`${styles.trainingStatus} ${training.status === 'completed' ? styles.completed : ''}`}
                                    onClick={(e) => handleStatusToggle(e, training.id, training.status)}
                                    title={training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                                    aria-label={training.status === 'completed' ? 'סמן אימון כלא בוצע' : 'סמן אימון כבוצע'}
                                >
                                    <CheckCircle size={24} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}

                {!upcomingTraining && remainingTodayTrainings.length === 0 && (
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

            {/* 4. Monthly Goals ("מטרות החודש") */}
            <div className={`${styles.dashSection} ${styles.delay3}`}>
                <div className={styles.valuesCard}>
                    <div className={styles.valuesTitle} style={{ color: 'var(--accent-600)' }}>
                        <Target size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                        מטרות החודש
                    </div>
                    <div className={styles.valuesContent}>
                        {monthlyGoals.length > 0 ? monthlyGoals.map((goal) => (
                            <span key={goal.id} className={styles.goalTag}>
                                {goal.name}
                            </span>
                        )) : (
                            <Link to="/monthly-themes" className={styles.ctaLink}>
                                הגדר מטרות לחודש הזה ←
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. Monthly Values — collapsible, hidden when empty */}
            {monthlyValues.length > 0 && (
                <div className={`${styles.dashSection} ${styles.delay4}`}>
                    <div className={styles.valuesCard}>
                        <button
                            className={styles.valuesToggle}
                            onClick={() => setValuesExpanded(!valuesExpanded)}
                            aria-expanded={valuesExpanded}
                            aria-label="הצג/הסתר ערכי החודש"
                        >
                            <div className={styles.valuesTitle} style={{ color: 'var(--primary-700)' }}>
                                <Heart size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                ערכי החודש
                            </div>
                            {valuesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {valuesExpanded && (
                            <div className={styles.valuesContent}>
                                {monthlyValues.map((value) => (
                                    <span key={value.id} className={styles.valueTag}>
                                        {value.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 6. Monthly Outstanding ("מצטיינים") */}
            <div className={`${styles.dashSection} ${styles.delay5}`}>
                <MonthlyOutstandingCard />
            </div>

            {/* 7. Weekly Trainings (Rest of week) - Moved to bottom */}
            <div className={`${styles.dashSection} ${styles.delay5}`}>
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
                                    aria-label={training.status === 'completed' ? 'סמן אימון כלא בוצע' : 'סמן אימון כבוצע'}
                                >
                                    <CheckCircle size={20} />
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
