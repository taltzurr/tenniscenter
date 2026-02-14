import { useState, useEffect, useMemo } from 'react';
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
    Target,
    Heart,
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
import useEventsStore from '../../../stores/eventsStore';
import useMonthlyThemesStore from '../../../stores/monthlyThemesStore';
import useMonthlyPlansStore from '../../../stores/monthlyPlansStore';
import { EVENT_COLORS, EVENT_LABELS } from '../../../services/events';
import { PLAN_STATUS } from '../../../config/constants';

import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
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

    // New Stores
    const { events, fetchEvents } = useEventsStore();
    const { currentTheme, fetchTheme } = useMonthlyThemesStore();
    const { currentPlan, fetchPlan, savePlan, submitPlan, isLoading: planLoading } = useMonthlyPlansStore();

    const [currentDate, setCurrentDate] = useState(() => {
        const dateParam = searchParams.get('date');
        if (!dateParam) return new Date();
        const parsed = new Date(dateParam);
        return isNaN(parsed) ? new Date() : parsed;
    });
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedDate, setSelectedDate] = useState(null);

    // Initial Data Load
    useEffect(() => {
        if (userData?.id) {
            // Fetch Groups
            if (!groups || groups.length === 0) {
                fetchGroups(userData.id, userData.role === 'supervisor');
            }
        }
    }, [userData, fetchGroups, groups?.length]);

    // Data Load on Month Change
    useEffect(() => {
        if (userData?.id) {
            try {
                // Determine Safe Dates
                const safeDate = (!currentDate || isNaN(currentDate)) ? new Date() : currentDate;
                const start = startOfMonth(subMonths(safeDate, 1));
                const end = endOfMonth(addMonths(safeDate, 1));

                // 1. Fetch Trainings
                fetchTrainings(userData.id, start, end);

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
    }, [userData, currentDate, selectedGroup, fetchTrainings, fetchEvents, fetchTheme, fetchPlan]);

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
                        // Ensure t.date is handled safely
                        let d = t.date;
                        if (t.date?.seconds) {
                            d = new Date(t.date.seconds * 1000);
                        } else if (typeof t.date === 'string') {
                            d = new Date(t.date);
                        }

                        // Valid Date check
                        if (!d || !(d instanceof Date) || isNaN(d)) return false;

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
                await submitPlan(planId, currentGroup?.name);
            }
        }
    };

    const handleDayClick = (day) => {
        // Find events on this day
        const dayEvents = (events || []).filter(e => {
            const d = e.date?.seconds ? new Date(e.date.seconds * 1000) : e.date;
            // Check invalid date
            if (!d || isNaN(d)) return false;
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
                const d = t.date?.seconds ? new Date(t.date.seconds * 1000) : t.date;
                return d && !isNaN(d) && isSameDay(d, day);
            })
            .sort((a, b) => {
                const dA = a.date?.seconds ? new Date(a.date.seconds * 1000) : a.date;
                const dB = b.date?.seconds ? new Date(b.date.seconds * 1000) : b.date;
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
                            סטטוס: <Badge variant={currentPlan?.status || 'default'}>{currentPlan?.status || 'טיוטה'}</Badge>
                        </div>
                    )}

                    <Button
                        disabled={!selectedGroup || selectedGroup === 'all' || isPlanSubmitted || planLoading}
                        onClick={handleSubmission}
                        variant={isPlanSubmitted ? "outline" : "primary"}
                        title={selectedGroup === 'all' ? 'יש לבחור קבוצה ספציפית כדי להגיש תכנית' : ''}
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
            </div>

            {/* Context Bar (Goals & Values) */}
            <div className={styles.contextBar}>
                {/* Monthly Values */}
                <div className={styles.valuesCard}>
                    <div className={styles.valuesTitle} style={{ color: 'var(--primary-700)' }}>
                        <Heart size={14} />
                        ערכי החודש
                    </div>
                    <div className={styles.valuesContent}>
                        {(currentTheme?.values?.length > 0 ? currentTheme.values : ['התמדה', 'משמעת עצמית', 'כבוד']).map((val, i) => (
                            <span key={i} className={styles.valueTag}>
                                {val}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Monthly Goals */}
                <div className={styles.valuesCard}>
                    <div className={styles.valuesTitle} style={{ color: 'var(--accent-600)' }}>
                        <Target size={14} />
                        מטרות החודש
                    </div>
                    <div className={styles.valuesContent}>
                        {(currentTheme?.goals?.length > 0 ? currentTheme.goals : ['שיפור משחק רשת', 'עבודת רגליים', 'יציבות בהגשה']).map((goal, i) => (
                            <span key={i} className={styles.goalTag}>
                                {goal}
                            </span>
                        ))}
                    </div>
                </div>
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
                            {groups && groups.map((group) => (
                                <button
                                    key={group.id}
                                    className={`${styles.filterChip} ${selectedGroup === group.id ? styles.active : ''}`}
                                    onClick={() => setSelectedGroup(group.id)}
                                >
                                    <span
                                        className={styles.groupDot}
                                        style={{ backgroundColor: group.color || stringToColor(group.name) }}
                                    />
                                    {group.name}
                                </button>
                            ))}
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
                <div className={styles.calendarContainer}>
                    <div className={styles.calendarGrid}>
                        {DAY_NAMES.map(day => (
                            <div key={day} className={styles.dayHeader}>{day}</div>
                        ))}

                        {calendarDays.map(day => {
                            const isCurrent = isSameMonth(day, currentDate);
                            const dayEvents = (events || []).filter(e => {
                                const d = e.date?.seconds ? new Date(e.date.seconds * 1000) : e.date;
                                if (!d || isNaN(d)) return false;
                                return isSameDay(d, day);
                            });
                            const dayTrainings = getTrainingsForDay(day);
                            const hasHoliday = dayEvents.some(e => e.type === 'holiday');

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`${styles.dayCell} ${!isCurrent ? styles.otherMonth : ''} ${hasHoliday ? styles.holidayCell : ''} ${isToday(day) ? styles.today : ''}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className={styles.dayTop}>
                                        <span className={styles.dayNumber}>{format(day, 'd')}</span>
                                        {dayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className={styles.eventPill}
                                                style={{ backgroundColor: EVENT_COLORS[event.type] }}
                                                title={event.title}
                                            />
                                        ))}
                                    </div>

                                    <div className={styles.dayContent}>
                                        {dayTrainings.map(t => {
                                            const group = groups?.find(g => g.id === t.groupId);
                                            const color = group?.color || stringToColor(group?.name);
                                            const d = t.date?.seconds ? new Date(t.date.seconds * 1000) : t.date;
                                            return (
                                                <div
                                                    key={t.id}
                                                    className={styles.trainingDot}
                                                    title={t.groupName}
                                                    style={{ backgroundColor: color, color: 'white' }}
                                                >
                                                    {d && !isNaN(d) ? format(d, 'HH:mm') : '??:??'}
                                                </div>
                                            );
                                        })}
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
                        .filter(t => isSameMonth(t.date, currentDate))
                        .sort((a, b) => a.date - b.date)
                        .map(training => {
                            const group = groups?.find(g => g.id === training.groupId);
                            const color = group?.color || stringToColor(group?.name);
                            return (
                                <div key={training.id} className={styles.listRow} onClick={() => navigate(`/trainings/${training.id}/edit`)}>
                                    <div className={styles.listRowHeader}>
                                        <div className={styles.listDate}>
                                            <span className={styles.listDay}>{format(training.date, 'd')}</span>
                                            <span className={styles.listMonth}>{format(training.date, 'MMM', { locale: he })}</span>
                                        </div>
                                        <div className={styles.listTime}>
                                            <Clock size={14} />
                                            {format(training.date, 'HH:mm')}
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

                    {filteredTrainings.filter(t => isSameMonth(t.date, currentDate)).length === 0 && (
                        <div className={styles.emptyList}>
                            <p>אין אימונים מתוכננים לחודש זה</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Day Interaction Modal */}
            {selectedDate && (
                <>
                    <div className={styles.modalOverlay} onClick={() => setSelectedDate(null)} />
                    <div className={styles.dayModal}>
                        <h3>{format(selectedDate, 'd בMMMM', { locale: he })}</h3>
                        <div className={styles.modalActions}>
                            <Button onClick={() => {
                                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                navigate(`/trainings/new?date=${dateStr}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`);
                            }}>
                                <Plus size={16} /> הוסף אימון
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

