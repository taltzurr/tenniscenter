import { useState, useEffect, useMemo, useCallback } from 'react';
import useSwipeNavigation from '../../../hooks/useSwipeNavigation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ChevronRight,
    ChevronLeft,
    Plus,
    MapPin,
    Clock,
    Edit2,
    X,
    CalendarDays,
    Send,
    CheckCircle,
    AlertCircle,
    Lock
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addMonths,
    subMonths
} from 'date-fns';
import { he } from 'date-fns/locale';

import useAuthStore from '../../../stores/authStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import useGroupsStore from '../../../stores/groupsStore';
import useUsersStore from '../../../stores/usersStore';
import useEventsStore from '../../../stores/eventsStore';
import useMonthlyThemesStore from '../../../stores/monthlyThemesStore';
import useMonthlyPlansStore from '../../../stores/monthlyPlansStore';
import useCentersStore from '../../../stores/centersStore';
import { normalizeDate } from '../../../utils/dateUtils';
import { EVENT_COLORS, EVENT_LABELS, isEventVisibleForCenter } from '../../../services/events';
import { PLAN_STATUS } from '../../../config/constants';

import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import StatusIndicator from '../../../components/ui/StatusIndicator/StatusIndicator';
import TrainingDetailsModal from '../../dashboard/TrainingDetailsModal';
import styles from './TrainingProgramPage.module.css';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
// Helper for consistent colors (copied from PlansList for now)
const STABLE_COLORS = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#16a34a', // green-600
    '#d97706', // amber-600
    '#7c3aed', // violet-600
    '#db2777', // pink-600
    '#0891b2', // cyan-600
    '#4f46e5', // indigo-600
];

const stringToColor = (str) => {
    if (!str) return '#6b7280';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % STABLE_COLORS.length);
    return STABLE_COLORS[index];
};

export default function TrainingProgramPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, isLoading: trainingsLoading } = useTrainingsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { users, fetchUsers } = useUsersStore();
    const isCenterManager = userData?.role === 'centerManager';
    const coachCenterId = userData?.centerIds?.[0] || userData?.managedCenterId || null;

    // New Stores
    const { events: allEvents, fetchEvents } = useEventsStore();
    const { fetchTheme } = useMonthlyThemesStore();
    const { currentPlan, fetchPlan, savePlan, submitPlan, isLoading: planLoading } = useMonthlyPlansStore();
    const { getCenterName } = useCentersStore();

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const MAX_VISIBLE_MOBILE = 3;

    const [currentDate, setCurrentDate] = useState(() => {
        const dateParam = searchParams.get('date');
        if (!dateParam) return new Date();
        const parsed = new Date(dateParam);
        return isNaN(parsed) ? new Date() : parsed;
    });
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTraining, setSelectedTraining] = useState(null);

    const handleNextMonth = useCallback(() => setCurrentDate(addMonths(currentDate, 1)), [currentDate]);
    const handlePrevMonth = useCallback(() => setCurrentDate(subMonths(currentDate, 1)), [currentDate]);
    const swipeHandlers = useSwipeNavigation(handleNextMonth, handlePrevMonth);

    // Initial Data Load
    useEffect(() => {
        if (userData?.id) {
            // Fetch Groups
            if (!groups || groups.length === 0) {
                if (isCenterManager) {
                    fetchGroups(userData.id, false, userData.managedCenterId);
                    fetchUsers();
                } else {
                    fetchGroups(userData.id, userData.role === 'supervisor');
                }
            }
        }
    }, [userData, fetchGroups, groups?.length, isCenterManager]);

    // Data Load on Month Change
    useEffect(() => {
        if (userData?.id) {
            try {
                // Determine Safe Dates
                const safeDate = (!currentDate || isNaN(currentDate)) ? new Date() : currentDate;
                const start = startOfMonth(subMonths(safeDate, 1));
                const end = endOfMonth(addMonths(safeDate, 1));

                // 1. Fetch Trainings (coaches only; center manager trainings fetched separately)
                if (!isCenterManager) {
                    fetchTrainings(userData.id, start, end);
                }

                // 2. Fetch Events (Organizational)
                fetchEvents(safeDate.getFullYear(), safeDate.getMonth());

                // 3. Fetch Theme (Goals/Values)
                fetchTheme(safeDate.getFullYear(), safeDate.getMonth());

                // 4. Fetch Plan Status (Wrapper)
                if (selectedGroup && selectedGroup !== 'all') {
                    fetchPlan(selectedGroup, safeDate.getFullYear(), safeDate.getMonth());
                }
            } catch (err) {
                console.error('CRITICAL ERROR IN TRAINING PAGE DATA LOAD:', err);
            }
        }
    }, [userData, currentDate, selectedGroup, fetchTrainings, fetchEvents, fetchTheme, fetchPlan, isCenterManager]);

    // For center managers: fetch trainings for all center coaches once users are loaded
    const currentMonth = currentDate;
    useEffect(() => {
        if (!isCenterManager || !users || users.length === 0) return;
        const centerId = userData?.managedCenterId;
        const coachIds = users
            .filter(u => u.role === 'coach' && u.centerIds?.includes(centerId))
            .map(u => u.id);
        const safeDate = (!currentMonth || isNaN(currentMonth)) ? new Date() : currentMonth;
        const monthStart = startOfMonth(subMonths(safeDate, 1));
        const monthEnd = endOfMonth(addMonths(safeDate, 1));
        useTrainingsStore.getState().fetchCenterTrainings(coachIds, monthStart, monthEnd);
    }, [isCenterManager, users?.length, currentMonth]);

    // Filter events visible for this coach's center
    const events = useMemo(() => {
        if (!allEvents) return [];
        return allEvents.filter(e => isEventVisibleForCenter(e, coachCenterId));
    }, [allEvents, coachCenterId]);

    // Helper: check if an event falls on a given day (supports date ranges)
    const isEventOnDay = useCallback((event, day) => {
        const d = normalizeDate(event.date);
        if (!d) return false;
        if (isSameDay(d, day)) return true;
        // Check date range
        const end = normalizeDate(event.endDate);
        if (end && day >= d && day <= end) return true;
        return false;
    }, []);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentDate]);

    const filteredTrainings = useMemo(() => {
        if (!trainings) return [];
        if (!selectedGroup || selectedGroup === 'all') return trainings;
        return trainings.filter(t => t.groupId === selectedGroup);
    }, [trainings, selectedGroup]);

    const currentGroup = groups?.find(g => g.id === selectedGroup);
    // Determine plan status only if a specific group is selected
    const isPlanSubmitted = currentGroup && (currentPlan?.status === PLAN_STATUS.SUBMITTED || currentPlan?.status === PLAN_STATUS.APPROVED);
    const isPlanApproved = currentGroup && (currentPlan?.status === PLAN_STATUS.APPROVED);

    // Active groups in the current month (for Legend in 'All' view)
    const activeGroupsInMonth = useMemo(() => {
        if (selectedGroup !== 'all') return [];
        // Safety check
        if (!trainings || trainings.length === 0) return [];
        if (!groups) return [];

        try {
            const groupIds = new Set(
                trainings
                    .filter(t => {
                        const d = normalizeDate(t.date);
                        if (!d) return false;
                        return isSameMonth(d, currentDate);
                    })
                    .map(t => t.groupId)
            );
            return groups.filter(g => groupIds.has(g.id));
        } catch (err) {
            console.error('Error calculating active groups', err);
            return [];
        }
    }, [trainings, currentDate, groups, selectedGroup]);

    // Handlers
    const handleSubmission = async () => {
        if (!selectedGroup || selectedGroup === 'all') return;

        if (window.confirm(`האם להגיש את תכנית האימונים לחודש ${format(currentDate, 'MMMM', { locale: he })} עבור קבוצת ${currentGroup?.name}?`)) {
            // Ensure plan doc exists
            let planId = currentPlan?.id;
            if (!planId) {
                const res = await savePlan({
                    groupId: selectedGroup,
                    coachId: userData.id,
                    year: currentDate.getFullYear(),
                    month: currentDate.getMonth(),
                    status: PLAN_STATUS.DRAFT
                });
                if (res.success) planId = res.plan.id;
            }

            if (planId) {
                const centerId = currentGroup?.centerId || coachCenterId || '';
                const centerName = centerId ? getCenterName(centerId) : '';
                await submitPlan(planId, currentGroup?.name, {
                    centerName,
                    coachName: userData?.displayName || userData?.email || '',
                    centerId
                });
            }
        }
    };

    const handleDayClick = (day) => {
        // Find events on this day
        const dayEvents = (events || []).filter(e => {
            const d = normalizeDate(e.date);
            if (!d) return false;
            return isSameDay(d, day);
        });

        // Check for blocking events (e.g. Holidays)
        const blockingEvent = dayEvents.find(e => e.type === 'holiday');
        if (blockingEvent) {
            alert(`יום זה הוא ${blockingEvent.title}. לא ניתן לקבוע אימון.`);
            return;
        }

        setSelectedDate(day);
    };

    const getTrainingsForDay = (day) => {
        return (filteredTrainings || [])
            .filter(t => {
                const d = normalizeDate(t.date);
                return d && isSameDay(d, day);
            })
            .sort((a, b) => {
                const dA = normalizeDate(a.date);
                const dB = normalizeDate(b.date);
                return (dA || 0) - (dB || 0);
            });
    };

    return (
        <div className={styles.page}>
            {/* Header Area */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>בניית תכנית אימון</h1>
                    <p className={styles.subtitle}>תכנון וניהול הלו"ז החודשי</p>
                </div>

                <div className={styles.headerActions}>
                    {selectedGroup && selectedGroup !== 'all' && (
                        <div className={styles.statusBadge}>
                            סטטוס: <StatusIndicator status={currentPlan?.status || 'draft'} />
                        </div>
                    )}

                    <Button
                        disabled={!selectedGroup || selectedGroup === 'all' || isPlanSubmitted || planLoading}
                        onClick={handleSubmission}
                        variant={isPlanSubmitted ? "outline" : "primary"}
                    >
                        {isPlanSubmitted ? (
                            <>
                                <CheckCircle size={18} />
                                {isPlanApproved ? 'התכנית אושרה' : 'התכנית הוגשה'}
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                הגש חודש לאישור
                            </>
                        )}
                    </Button>
                </div>
                {(!selectedGroup || selectedGroup === 'all') && (
                    <p className={styles.submitHint}>
                        💡 יש לבחור קבוצה ספציפית כדי להגיש — ההגשה היא לפי קבוצה בנפרד
                    </p>
                )}
            </div>

            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
                {/* 1. Filters & Navigation (Left Sidebar style or Top bar) */}
                <div className={styles.controls}>
                    {/* Group Selector */}
                    <div className={styles.groupSelector}>
                        <label className={styles.sectionLabel}>קבוצה לתכנון:</label>
                        <div className={styles.groupChips}>
                            <button
                                className={`${styles.filterChip} ${selectedGroup === 'all' ? styles.active : ''}`}
                                onClick={() => setSelectedGroup('all')}
                            >
                                <span className={styles.groupDot} style={{ backgroundColor: '#6b7280' }} />
                                כל הקבוצות
                            </button>
                            {groups && groups.map((group) => {
                                const groupColor = group.color || stringToColor(group.name);
                                const isActive = selectedGroup === group.id;
                                return (
                                    <button
                                        key={group.id}
                                        className={`${styles.filterChip} ${isActive ? styles.active : ''}`}
                                        onClick={() => setSelectedGroup(group.id)}
                                        style={isActive ? {
                                            backgroundColor: groupColor,
                                            borderColor: groupColor,
                                            color: 'white'
                                        } : undefined}
                                    >
                                        <span
                                            className={styles.groupDot}
                                            style={{ backgroundColor: isActive ? 'white' : groupColor }}
                                        />
                                        {group.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Month Navigation */}
                    <div className={styles.monthNav}>
                        <button className={styles.navButton} onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                            <ChevronRight size={20} />
                        </button>
                        <span className={styles.currentMonth}>
                            {format(currentDate, 'MMMM yyyy', { locale: he })}
                        </span>
                        <button className={styles.navButton} onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                            <ChevronLeft size={20} />
                        </button>
                    </div>

                    {/* Legend */}
                    <div className={styles.legend}>
                        <div className={styles.legendItem}>
                            <div className={styles.legendDot} style={{ background: EVENT_COLORS.holiday }}></div>
                            <span>חג/חופשה</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendDot} style={{ background: EVENT_COLORS.competition }}></div>
                            <span>תחרות</span>
                        </div>

                        {selectedGroup === 'all' ? (
                            // Show all/active groups in 'all' view
                            activeGroupsInMonth && activeGroupsInMonth.length > 0 ? (
                                activeGroupsInMonth.map(g => (
                                    <div key={g.id} className={styles.legendItem}>
                                        <div
                                            className={styles.legendDot}
                                            style={{ backgroundColor: g.color || stringToColor(g.name) }}
                                        />
                                        <span>{g.name}</span>
                                    </div>
                                ))
                            ) : (
                                // No specific groups active? maybe show nothing or generic
                                null
                            )
                        ) : (
                            // Show Specific Group
                            currentGroup && (
                                <div className={styles.legendItem}>
                                    <div
                                        className={styles.legendDot}
                                        style={{ backgroundColor: currentGroup.color || stringToColor(currentGroup.name) }}
                                    />
                                    <span>{currentGroup.name}</span>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* 2. Calendar */}
                <div className={styles.calendarContainer} {...swipeHandlers}>
                    <div className={styles.calendarGrid}>
                        {DAY_NAMES.map(day => (
                            <div key={day} className={styles.dayHeader}>{day}</div>
                        ))}

                        {calendarDays.map(day => {
                            const isCurrent = isSameMonth(day, currentDate);
                            const dayEvents = (events || []).filter(e => isEventOnDay(e, day));
                            const dayTrainings = getTrainingsForDay(day);
                            const hasHoliday = dayEvents.some(e => e.type === 'holiday');

                            // On mobile, combine events + trainings and limit visible count
                            const totalItems = dayEvents.length + dayTrainings.length;
                            const visibleEvents = isMobile ? dayEvents.slice(0, MAX_VISIBLE_MOBILE) : dayEvents;
                            const remainingSlots = isMobile ? Math.max(0, MAX_VISIBLE_MOBILE - visibleEvents.length) : dayTrainings.length;
                            const visibleTrainings = dayTrainings.slice(0, remainingSlots);
                            const hiddenCount = isMobile ? totalItems - visibleEvents.length - visibleTrainings.length : 0;

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`${styles.dayCell} ${!isCurrent ? styles.otherMonth : ''} ${hasHoliday ? styles.holidayCell : ''} ${isToday(day) ? styles.today : ''}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className={styles.dayTop}>
                                        <span className={styles.dayNumber}>{format(day, 'd')}</span>
                                    </div>

                                    <div className={styles.dayContent}>
                                        {visibleEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className={styles.eventPill}
                                                style={{ backgroundColor: EVENT_COLORS[event.type] || EVENT_COLORS.OTHER }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </div>
                                        ))}
                                        {visibleTrainings.map(t => {
                                            const group = groups?.find(g => g.id === t.groupId);
                                            const color = group?.color || stringToColor(group?.name);
                                            const d = normalizeDate(t.date);
                                            return (
                                                <div
                                                    key={t.id}
                                                    className={styles.trainingDot}
                                                    title={t.groupName}
                                                    style={{ backgroundColor: color, color: 'white' }}
                                                >
                                                    {d ? format(d, 'HH:mm') : '??:??'}
                                                    {!isMobile && group?.name ? ` ${group.name}` : ''}
                                                </div>
                                            );
                                        })}
                                        {hiddenCount > 0 && (
                                            <div className={styles.moreBadge}>+{hiddenCount}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. List View (Below Calendar) */}
            <div className={styles.listViewSection}>
                <h3 className={styles.sectionTitle}>פירוט אימונים חודשי</h3>
                <div className={styles.trainingsList}>
                    {filteredTrainings
                        .filter(t => { const d = normalizeDate(t.date); return d && isSameMonth(d, currentDate); })
                        .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0))
                        .map(training => {
                            const tDate = normalizeDate(training.date);
                            const group = groups?.find(g => g.id === training.groupId);
                            const color = group?.color || stringToColor(group?.name);
                            return (
                                <div key={training.id} className={styles.listRow} onClick={() => {
                                            setSelectedTraining({
                                                ...training,
                                                day: tDate ? format(tDate, 'EEEE', { locale: he }) : '',
                                                fullDate: tDate ? format(tDate, 'd בMMMM', { locale: he }) : '',
                                                time: tDate ? format(tDate, 'HH:mm') : '--:--',
                                                duration: `${training.durationMinutes || 60} דק'`,
                                                group: group?.name || training.groupName || 'קבוצה',
                                                location: training.location || 'מגרש ראשי',
                                            });
                                        }}>
                                    <div className={styles.listRowHeader}>
                                        <div className={styles.listDate}>
                                            <span className={styles.listDay}>{tDate ? format(tDate, 'd') : '-'}</span>
                                            <span className={styles.listMonth}>{tDate ? format(tDate, 'MMM', { locale: he }) : ''}</span>
                                        </div>
                                        <div className={styles.listTime}>
                                            <Clock size={14} />
                                            {tDate ? format(tDate, 'HH:mm') : '--:--'}
                                        </div>
                                        <div className={styles.listActions}>
                                            <Edit2 size={16} />
                                        </div>
                                    </div>
                                    <div className={styles.listInfo}>
                                        <div className={styles.listGroup} style={{ color: color }}>{training.groupName}</div>
                                        <div className={styles.listTopic}>{training.topic || 'נושא לא הוגדר'}</div>
                                    </div>
                                </div>
                            );
                        })}

                    {filteredTrainings.filter(t => { const d = normalizeDate(t.date); return d && isSameMonth(d, currentDate); }).length === 0 && (
                        <div className={styles.emptyList}>
                            <p>אין אימונים מתוכננים לחודש זה</p>
                        </div>
                    )}
                </div>
            </div>

            <TrainingDetailsModal
                training={selectedTraining}
                isOpen={!!selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />

            {/* Day Interaction Modal */}
            {selectedDate && (
                <>
                    <div className={styles.modalOverlay} onClick={() => setSelectedDate(null)} />
                    <div className={styles.dayModal}>
                        <h3>{format(selectedDate, 'd בMMMM', { locale: he })}</h3>
                        <div className={styles.modalActions}>
                            {!isCenterManager && (
                            <Button onClick={() => {
                                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                navigate(`/trainings/new?date=${dateStr}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`);
                            }}>
                                <Plus size={16} /> הוסף אימון
                            </Button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

