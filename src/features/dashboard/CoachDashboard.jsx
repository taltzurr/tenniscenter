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
    ChevronUp,
    MapPin
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
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
            endOfWeek.setHours(23, 59, 59, 999);

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

        return trainings
            .filter(t => {
                if (!t.date) return false;
                // Handle both Firestore Timestamp and JS Date objects
                const tDate = t.date.toDate ? t.date.toDate() : new Date(t.date);

                // Strict date comparison (Day, Month, Year) to avoid timezone/time-range issues
                return tDate.getDate() === today.getDate() &&
                    tDate.getMonth() === today.getMonth() &&
                    tDate.getFullYear() === today.getFullYear();
            })
            .map(t => {
                const group = groups.find(g => g.id === t.groupId);
                const tDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
                return {
                    id: t.id,
                    ...t, // Spread all original fields (description, focus, equipment, etc.)
                    time: tDate ? tDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '--:--',
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
                        <CalendarDays size={20} style={{ display: 'inline', marginLeft: '8px' }} />
                        אימוני היום
                    </h2>
                    <Link to="/calendar" className={styles.sectionAction}>
                        תכנית אימון מלאה
                        <ChevronLeft size={16} style={{ display: 'inline' }} />
                    </Link>
                </div>

                {/* Hero Card */}
                <div style={{ marginBottom: 'var(--space-8)' }}>
                    <UpcomingTrainingCard
                        training={upcomingTraining}
                        nextTraining={weeklyTrainings[0] || null}
                        onConfirm={handleHeroConfirm}
                    />
                </div>

                {/* Today's Events */}
                {todayEvents.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: '1rem' }}
                            >
                                {/* Time Section (Right Side) */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: '60px',
                                    borderLeft: '1px solid var(--gray-200)',
                                    paddingLeft: '1rem'
                                }}>
                                    <span className={styles.trainingTimeValue} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-600)' }}>
                                        {training.time}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>היום</span>
                                </div>

                                {/* Content Section */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div className={styles.trainingGroup} style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                        {training.topic || training.group}
                                    </div>

                                    <div className={styles.trainingMeta} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Users size={14} />
                                            {training.group}
                                        </span>
                                        <span style={{ color: 'var(--gray-300)' }}>•</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={14} />
                                            {training.location}
                                        </span>
                                        <span style={{ color: 'var(--gray-300)' }}>•</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} />
                                            {training.duration}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Icon / Action (Left Side) */}
                                <div>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--gray-100)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--gray-400)'
                                    }}>
                                        <CheckCircle size={18} />
                                    </div>
                                </div>
                            </div>
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
