import { useEffect, useMemo, useState, useCallback } from 'react';
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
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import useEventsStore from '../../stores/eventsStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import { normalizeDate, formatHebrewTime, isSameDay } from '../../utils/dateUtils';
import { getGreeting } from '../../utils/greeting';
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!userData?.id) return;
            try {
                setIsLoading(true);
                setError(null);

                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
                endOfWeek.setHours(23, 59, 59, 999);

                await Promise.all([
                    fetchGroups(userData.id),
                    fetchTrainings(userData.id, startOfWeek, endOfWeek),
                    fetchEvents(today.getFullYear(), today.getMonth()),
                ]);

                if (endOfWeek.getMonth() !== today.getMonth()) {
                    await fetchEvents(endOfWeek.getFullYear(), endOfWeek.getMonth());
                }
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
                setError('שגיאה בטעינת הנתונים. נסה לרענן את הדף.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [userData, fetchTrainings, fetchGroups, fetchEvents]);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        fetchTheme(currentYear, currentMonth);
    }, [fetchTheme]);

    // Today's trainings
    const todayTrainings = useMemo(() => {
        const today = new Date();

        return trainings
            .filter(t => {
                if (!t.date) return false;
                const tDate = normalizeDate(t.date);
                return isSameDay(tDate, today);
            })
            .map(t => {
                const group = groups.find(g => g.id === t.groupId);
                const tDate = normalizeDate(t.date);
                return {
                    id: t.id,
                    ...t,
                    time: formatHebrewTime(tDate),
                    duration: `${t.durationMinutes || 60} דק'`,
                    topic: t.topic,
                    group: group?.name || t.groupName || 'קבוצה',
                    location: t.location || 'מגרש ראשי',
                    status: t.status || 'planned',
                    groupId: t.groupId,
                    rawDate: tDate
                };
            });
    }, [trainings, groups]);

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

    // Remaining today's trainings (show all, not just those not in hero)
    const remainingTodayTrainings = useMemo(() => {
        return todayTrainings;
    }, [todayTrainings]);

    // Weekly trainings (future days only)
    const weeklyTrainings = useMemo(() => {
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        return trainings
            .filter(t => {
                if (!t.date) return false;
                const tDate = normalizeDate(t.date);
                return tDate && tDate > todayEnd;
            })
            .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0))
            .map(t => {
                const group = groups.find(g => g.id === t.groupId);
                const tDate = normalizeDate(t.date);
                return {
                    id: t.id,
                    time: formatHebrewTime(tDate),
                    duration: `${t.durationMinutes || 60} דק'`,
                    group: group?.name || t.groupName || 'קבוצה',
                    location: t.location || 'מגרש ראשי',
                    status: t.status || 'planned',
                    groupId: t.groupId
                };
            });
    }, [trainings, groups]);

    // Contextual greeting subtitle


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
            const d = normalizeDate(e.date);
            return isSameDay(d, today);
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

    const handleStatusToggle = useCallback(async (e, trainingId, currentStatus) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        try {
            await editTraining(trainingId, { status: newStatus });
        } catch (err) {
            console.error('Failed to toggle training status:', err);
        }
    }, [editTraining]);

    const handleHeroConfirm = useCallback(async (trainingId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        try {
            await editTraining(trainingId, { status: newStatus });
        } catch (err) {
            console.error('Failed to toggle training status:', err);
        }
    }, [editTraining]);

    if (isLoading) {
        return (
            <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: 'var(--space-4)' }}>
                <p style={{ color: 'var(--error-600)', fontSize: 'var(--font-size-base)' }}>{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>נסה שוב</Button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* 1. Greeting */}
            <div className={`${styles.dashSection} ${styles.delay0}`}>
                <div className={styles.greeting}>
                    <h1 className={styles.greetingTitle}>
                        {getGreeting()}, {(userData?.displayName || userData?.name || 'מאמן').split(' ')[0]}! 👋
                    </h1>
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
                        <CalendarDays size={20} style={{ display: 'inline', marginInlineStart: '8px' }} />
                        אימוני היום
                    </h2>
                    <Link to="/calendar" className={styles.sectionAction}>
                        תכנית אימון מלאה
                        <ChevronLeft size={16} style={{ display: 'inline' }} />
                    </Link>
                </div>

                {/* Hero Card */}
                <div className={styles.section}>
                    <UpcomingTrainingCard
                        training={upcomingTraining}
                        nextTraining={weeklyTrainings[0] || null}
                        onConfirm={handleHeroConfirm}
                        onClick={() => handleTrainingClick(upcomingTraining)}
                    />
                </div>

                {/* Today's Events */}
                {todayEvents.length > 0 && (
                    <div className={styles.eventsContainer}>
                        {todayEvents.map(event => (
                            <div
                                key={event.id}
                                className={`${styles.eventCard} ${event.type === 'holiday' ? styles.eventHoliday : styles.eventDefault}`}
                            >
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
                            <TrainingCard
                                key={training.id}
                                training={training}
                                variant="full"
                                clickable
                                toggleable
                                onClick={handleTrainingClick}
                                onStatusToggle={handleStatusToggle}
                            />
                        ))}
                    </div>
                ) : null}

                {!upcomingTraining && remainingTodayTrainings.length === 0 && (
                    <div className={styles.emptyState}>
                        <CalendarDays className={styles.emptyIcon} />
                        <p className={styles.emptyText}>אין אימונים מתוכננים להיום</p>
                        <Link to={`/trainings/new?date=${new Date().toISOString().split('T')[0]}`}>
                            <Button variant="outline">
                                הוסף אימון
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* 4. Monthly Goals ("מטרות החודש") */}
            {/* 4. Monthly Goals ("מטרות החודש") */}
            <div className={`${styles.dashSection} ${styles.delay3}`}>
                <div className={styles.dashboardCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle} style={{ color: 'var(--accent-700)' }}>
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
                                שאל את המנהל שלך על המטרות החודש
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. Monthly Values ("ערכי החודש") */}
            <div className={`${styles.dashSection} ${styles.delay4}`}>
                <div className={styles.dashboardCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle} style={{ color: 'var(--primary-700)' }}>
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
                                שאל את המנהל שלך על הערכים החודש
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 6. Monthly Outstanding ("מצטיינים") */}
            <div className={`${styles.dashSection} ${styles.delay5}`}>
                <MonthlyOutstandingCard />
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
