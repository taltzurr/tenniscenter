import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Heart,
    CalendarDays,
    Target,
    BookOpen,
    FileText,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import useEventsStore from '../../stores/eventsStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import useMonthlyPlansStore from '../../stores/monthlyPlansStore';
import { DEFAULT_GROUP_TYPES } from '../../config/constants';
import { normalizeDate, formatHebrewTime, isSameDay } from '../../utils/dateUtils';
import { getGreeting } from '../../utils/greeting';
import TrainingDetailsModal from './TrainingDetailsModal';
import MonthlyOutstandingCard from './MonthlyOutstandingCard';
import UpcomingTrainingCard from './UpcomingTrainingCard';
import QuickStats from './QuickStats';
import MonthlyPlansStatus from './MonthlyPlansStatus';
import WeekSchedule from './WeekSchedule';
import CompletionRing from './CompletionRing';
import CompletionDetail from './CompletionDetail';
import EventDetailsModal from '../../components/ui/EventDetailsModal/EventDetailsModal';
import { isEventVisibleForCenter, EVENT_COLORS } from '../../services/events';
import styles from './CoachDashboard.module.css';

function CoachDashboard() {
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, editTraining } = useTrainingsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { events, fetchEvents } = useEventsStore();
    const { fetchTheme, currentTheme } = useMonthlyThemesStore();
    const { plans, fetchCoachPlans } = useMonthlyPlansStore();
    const navigate = useNavigate();

    const [selectedTraining, setSelectedTraining] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showCompletionDetail, setShowCompletionDetail] = useState(false);
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
                    fetchCoachPlans(userData.id, today.getFullYear()),
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
    }, [userData, fetchTrainings, fetchGroups, fetchEvents, fetchCoachPlans]);

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

    // Remaining today's trainings
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

    // Stats
    const stats = useMemo(() => {
        const groupCount = groups.length;
        const trainingsThisWeek = trainings.length;
        const completed = trainings.filter(t => t.status === 'completed').length;

        return [
            { icon: Users, label: 'קבוצות', value: groupCount, color: 'blue', path: '/groups' },
            { icon: Calendar, label: 'אימונים השבוע', value: trainingsThisWeek, color: 'yellow', path: '/weekly-schedule' },
            { icon: CheckCircle, label: 'בוצעו', value: completed, color: 'green', path: '/weekly-completed' },
        ];
    }, [groups, trainings]);

    // Completion data for the ring
    const completionData = useMemo(() => {
        const completed = trainings.filter(t => t.status === 'completed').length;
        return { completed, total: trainings.length };
    }, [trainings]);

    // Contextual greeting subtitle
    const greetingSubtitle = useMemo(() => {
        const todayCount = todayTrainings.length;
        const hasRejected = plans.some(p => {
            const now = new Date();
            return p.year === now.getFullYear() && p.month === now.getMonth() && p.status === 'rejected';
        });

        if (hasRejected) {
            return 'יש תכנית חודשית שנדחתה — שים לב';
        }

        const pct = completionData.total > 0
            ? Math.round((completionData.completed / completionData.total) * 100)
            : 0;

        if (pct === 100 && completionData.total > 0) {
            return 'שבוע מושלם — כל האימונים בוצעו!';
        }

        if (todayCount === 0) {
            return 'אין אימונים מתוכננים להיום';
        }

        if (todayCount === 1) {
            return 'יש לך אימון אחד היום';
        }

        return `יש לך ${todayCount} אימונים היום`;
    }, [todayTrainings, plans, completionData]);

    const coachCenterId = userData?.centerIds?.[0] || null;

    const visibleEvents = useMemo(() => {
        return events.filter(e => isEventVisibleForCenter(e, coachCenterId));
    }, [events, coachCenterId]);

    // Today's events
    const todayEvents = useMemo(() => {
        const today = new Date();
        return visibleEvents.filter(e => {
            const d = e.date instanceof Date ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date));
            if (!d) return false;
            const startMatch = isSameDay(d, today);
            if (e.endDate) {
                const end = e.endDate instanceof Date ? e.endDate : new Date(e.endDate);
                return (today >= d && today <= end) || startMatch;
            }
            return startMatch;
        });
    }, [visibleEvents]);

    // Upcoming events (next 7 days)
    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        return visibleEvents.filter(e => {
            const d = e.date instanceof Date ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date));
            if (!d) return false;
            return d >= today && d <= weekFromNow;
        }).sort((a, b) => {
            const da = a.date instanceof Date ? a.date : new Date(a.date);
            const db = b.date instanceof Date ? b.date : new Date(b.date);
            return da - db;
        });
    }, [visibleEvents]);

    // Monthly themes
    const monthlyValues = useMemo(() => {
        if (currentTheme?.values && currentTheme.values.length > 0) {
            return currentTheme.values.map((val, i) => ({ id: `v-${i}`, name: val }));
        }
        return [];
    }, [currentTheme]);

    const monthlyGoals = useMemo(() => {
        if (!currentTheme?.goals || typeof currentTheme.goals !== 'object') return [];

        const coachGroupTypeIds = new Set(
            groups.map(g => g.groupTypeId).filter(Boolean)
        );

        const typeNameMap = Object.fromEntries(DEFAULT_GROUP_TYPES.map(t => [t.id, t.name]));

        return Object.entries(currentTheme.goals)
            .filter(([typeId, value]) => value && value.trim() && coachGroupTypeIds.has(typeId))
            .map(([typeId, value]) => ({
                id: typeId,
                name: value,
                typeName: typeNameMap[typeId] || typeId,
            }));
    }, [currentTheme, groups]);

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
            {/* 1. Greeting with contextual subtitle */}
            <div className={`${styles.dashSection} ${styles.delay0}`}>
                <div className={styles.greeting}>
                    <h1 className={styles.greetingTitle}>
                        {getGreeting()}, {(userData?.displayName || userData?.name || 'מאמן').split(' ')[0]}!{' '}
                        <span className={styles.greetingEmoji}>👋</span>
                    </h1>
                    <p className={styles.greetingSubtitle}>{greetingSubtitle}</p>
                </div>
            </div>

            {/* 2. Quick Stats (3 cards) + Completion Ring */}
            <div className={`${styles.dashSection} ${styles.delay1}`}>
                <div className={styles.statsRow}>
                    <QuickStats stats={stats} />
                    <div
                        className={styles.ringCard}
                        onClick={() => setShowCompletionDetail(true)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setShowCompletionDetail(true)}
                    >
                        <CompletionRing
                            completed={completionData.completed}
                            total={completionData.total}
                            size={52}
                        />
                        <span className={styles.ringLabel}>ביצוע שבועי</span>
                    </div>
                </div>
            </div>

            {/* 3. Today's Trainings */}
            <div className={`${styles.dashSection} ${styles.delay2}`}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleRow}>
                        <CalendarDays size={18} className={styles.sectionIcon} />
                        <h2 className={styles.sectionTitle}>אימוני היום</h2>
                    </div>
                    <Link to="/calendar" className={styles.sectionAction}>
                        תכנית אימון מלאה
                        <ChevronLeft size={14} />
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
                                onClick={() => setSelectedEvent(event)}
                                style={{ cursor: 'pointer' }}
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

            {/* 4. Rest of Week */}
            <div className={`${styles.dashSection} ${styles.delay3}`}>
                <WeekSchedule
                    trainings={trainings}
                    groups={groups}
                    onTrainingClick={handleTrainingClick}
                />
            </div>

            {/* 5. Upcoming Events */}
            {upcomingEvents.length > 0 && (
                <div className={`${styles.dashSection} ${styles.delay3}`}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleRow}>
                            <Calendar size={18} className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>אירועים קרובים</h2>
                        </div>
                    </div>
                    <div className={styles.eventsContainer}>
                        {upcomingEvents.map(event => {
                            const d = event.date instanceof Date ? event.date : new Date(event.date);
                            const dateStr = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
                            return (
                                <div
                                    key={event.id}
                                    className={styles.eventCardFull}
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    <div className={styles.eventDot} style={{ backgroundColor: EVENT_COLORS[event.type] || '#6B7280' }} />
                                    <div className={styles.eventCardContent}>
                                        <div className={styles.eventCardTitle}>{event.title}</div>
                                        <div className={styles.eventCardMeta}>
                                            {dateStr}
                                            {event.time && ` · ${event.time}`}
                                            {event.location && ` · ${event.location}`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={styles.sectionDivider} />

            {/* 6. Monthly Plans Status */}
            {groups.length > 0 && (
                <div className={`${styles.dashSection} ${styles.delay4}`}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleRow}>
                            <FileText size={18} className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>תכניות חודשיות</h2>
                        </div>
                        <Link to="/monthly-plans" className={styles.sectionAction}>
                            הצג הכל
                            <ChevronLeft size={14} />
                        </Link>
                    </div>
                    <MonthlyPlansStatus plans={plans} groups={groups} />
                </div>
            )}

            {/* 7. Monthly Info */}
            <div className={`${styles.dashSection} ${styles.delay4}`}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleRow}>
                        <BookOpen size={18} className={styles.sectionIcon} />
                        <h2 className={styles.sectionTitle}>מידע חודשי</h2>
                    </div>
                </div>

                {/* Goals & Values Grid */}
                <div className={styles.monthlyCardsGrid}>
                    {/* Monthly Goals */}
                    <div className={styles.contextCard}>
                        <div className={styles.contextCardHeader}>
                            <Target size={16} className={styles.contextCardIcon} style={{ color: 'var(--accent-700)' }} />
                            <h3 className={styles.contextCardTitle}>מטרות החודש</h3>
                        </div>
                        {monthlyGoals.length > 0 ? (
                            <div className={styles.goalsList}>
                                {monthlyGoals.map((goal) => (
                                    <div key={goal.id} className={styles.goalItem}>
                                        <span className={styles.goalTypeBadge}>{goal.typeName}</span>
                                        <span className={styles.goalText}>{goal.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.contextEmpty}>שאל את המנהל שלך על המטרות החודש</div>
                        )}
                    </div>

                    {/* Monthly Values */}
                    <div className={styles.contextCard}>
                        <div className={styles.contextCardHeader}>
                            <Heart size={16} className={styles.contextCardIcon} style={{ color: 'var(--primary-600)' }} />
                            <h3 className={styles.contextCardTitle}>ערכי החודש</h3>
                        </div>
                        {monthlyValues.length > 0 ? (
                            <div className={styles.valuesList}>
                                {monthlyValues.map((value) => (
                                    <span key={value.id} className={styles.valueTag}>{value.name}</span>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.contextEmpty}>שאל את המנהל שלך על הערכים החודש</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 8. Monthly Outstanding */}
            <div className={`${styles.dashSection} ${styles.delay5}`}>
                <MonthlyOutstandingCard />
            </div>

            {/* Modals */}
            <TrainingDetailsModal
                isOpen={!!selectedTraining}
                training={selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />

            <EventDetailsModal
                isOpen={!!selectedEvent}
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                canEdit={false}
                centers={[]}
            />

            <CompletionDetail
                isOpen={showCompletionDetail}
                onClose={() => setShowCompletionDetail(false)}
                trainings={trainings}
                groups={groups}
            />
        </div>
    );
}

export default CoachDashboard;
