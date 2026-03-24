import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ChevronRight,
    ChevronLeft,
    Users,
    LayoutList,
    LayoutGrid,
    Check
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    getDaysInMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isWithinInterval
} from 'date-fns';
import { he } from 'date-fns/locale';

import { Navigate } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import useEventsStore from '../../../stores/eventsStore';
import { EVENT_COLORS, EVENT_LABELS } from '../../../services/events';
import Modal from '../../../components/ui/Modal'; // Import Modal

import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import StatusIndicator from '../../../components/ui/StatusIndicator/StatusIndicator';
import TrainingDetailsModal from '../../dashboard/TrainingDetailsModal';
import { normalizeDate } from '../../../utils/dateUtils';
import styles from './PlansList.module.css';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 - 21:00

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

const TRAINING_TYPE_COLORS = {
    technical: '#3b82f6', // blue
    tactical: '#10b981',  // green
    fitness: '#f59e0b',   // orange
    mental: '#8b5cf6',    // purple
    social: '#ec4899',    // pink
    other: '#6b7280'      // gray
};

const stringToColor = (str) => {
    if (!str) return '#6b7280';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % STABLE_COLORS.length);
    return STABLE_COLORS[index];
};

// Use normalizeDate from dateUtils for consistent Firestore Timestamp handling
const parseDateSafe = (dateInput) => {
    return normalizeDate(dateInput);
};

function PlansList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userData, isCenterManager, isSupervisor } = useAuthStore();

    // Stores - must be called before any conditional returns (React hooks rules)
    const { groups, fetchGroups } = useGroupsStore();
    const { trainings, fetchTrainings, editTraining, isLoading: trainingsLoading } = useTrainingsStore();
    const { events, fetchEvents, isLoading: eventsLoading } = useEventsStore();

    // Center managers and supervisors belong on the review page, not the coach plans list
    if (isCenterManager() || isSupervisor()) {
        return <Navigate to="/monthly-plans/review" replace />;
    }

    // State
    const [currentDate, setCurrentDate] = useState(() => {
        try {
            const year = searchParams.get('year');
            const month = searchParams.get('month');
            if (year && month) {
                const date = new Date(parseInt(year), parseInt(month));
                if (!isNaN(date.getTime())) return date;
            }
        } catch (e) {
            console.error("Invalid date params", e);
        }
        return new Date();
    });

    const [selectedGroupId, setSelectedGroupId] = useState('all');
    const [selectedDateModal, setSelectedDateModal] = useState(null); // Modal State
    const [selectedTraining, setSelectedTraining] = useState(null);

    // Stats for Header
    const stats = useMemo(() => {
        // Safe helpers
        const safeCurrent = isNaN(currentDate?.getTime()) ? new Date() : currentDate;
        const start = startOfMonth(safeCurrent);
        const end = endOfMonth(safeCurrent);

        const filteredTrainings = trainings.filter(t => {
            const tDate = parseDateSafe(t.date);
            if (!tDate) return false;

            const isInRange = isWithinInterval(tDate, { start, end });
            const isGroupMatch = selectedGroupId === 'all' || t.groupId === selectedGroupId;
            return isInRange && isGroupMatch;
        });

        const completed = filteredTrainings.filter(t => t.status === 'completed').length;
        const total = filteredTrainings.length;

        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }, [trainings, currentDate, selectedGroupId]);

    // Load Data
    useEffect(() => {
        if (userData?.id) {
            fetchGroups(userData.id);

            const safeDate = isNaN(currentDate?.getTime()) ? new Date() : currentDate;
            const start = startOfMonth(safeDate);
            const end = endOfMonth(safeDate);

            fetchTrainings(userData.id, start, end);
            fetchEvents(safeDate.getFullYear(), safeDate.getMonth());
        }
    }, [userData, currentDate, fetchGroups, fetchTrainings, fetchEvents]);

    const handlePrevious = () => {
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNext = () => {
        setCurrentDate(prev => addMonths(prev, 1));
    };

    const handleDayClick = (date) => {
        setSelectedDateModal(date); // Open Modal
    };

    const openTrainingModal = (training) => {
        const tDate = parseDateSafe(training.date);
        const group = groups.find(g => g.id === training.groupId);
        setSelectedTraining({
            ...training,
            day: tDate ? format(tDate, 'EEEE', { locale: he }) : '---',
            fullDate: tDate ? format(tDate, 'd בMMMM', { locale: he }) : '---',
            time: tDate ? format(tDate, 'HH:mm') : '--:--',
            duration: `${training.durationMinutes || 60} דק'`,
            group: group?.name || training.groupName || 'קבוצה',
            location: training.location || 'מגרש ראשי',
        });
    };

    const handleToggleStatus = async (e, training) => {
        e.stopPropagation();

        const newStatus = training.status === 'completed' ? 'planned' : 'completed';
        // Only set executedBy if marking as completed
        const executedBy = newStatus === 'completed' ? (userData?.displayName || 'User') : null;

        await editTraining(training.id, {
            status: newStatus,
            executedBy: executedBy
        });
    };



    // Calendar Grid Logic (Month)
    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDayOfMonth = getDay(startOfMonth(currentDate));

        const days = [];

        // Empty slots
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ type: 'empty', key: `empty-${i}` });
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);

            // Events
            const dayEvents = events.filter(e => {
                const eDate = parseDateSafe(e.startDate || e.date);
                return eDate && isSameDay(eDate, date);
            });

            // Trainings
            const dayTrainings = trainings.filter(t => {
                const tDate = parseDateSafe(t.date);
                return tDate && isSameDay(tDate, date) && (selectedGroupId === 'all' || t.groupId === selectedGroupId);
            });

            days.push({
                type: 'day',
                key: `day-${day}`,
                date,
                day,
                events: dayEvents,
                trainings: dayTrainings.sort((a, b) => {
                    const dateA = parseDateSafe(a.date) || new Date(0);
                    const dateB = parseDateSafe(b.date) || new Date(0);
                    return dateA - dateB;
                })
            });
        }
        return days;
    }, [currentDate, events, trainings, selectedGroupId]);

    const activeGroupsInMonth = useMemo(() => {
        const groupIds = new Set(trainings.map(t => t.groupId));
        return groups.filter(g => groupIds.has(g.id));
    }, [trainings, groups]);

    // Weekly List Logic (Always visible for CURRENT week)
    const weekDays = useMemo(() => {
        // FIXED to Current Date (User Request)
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 0 });
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = addDays(start, i);

            const dayTrainings = trainings.filter(t => {
                const tDate = parseDateSafe(t.date);
                return tDate && isSameDay(tDate, date) && (selectedGroupId === 'all' || t.groupId === selectedGroupId);
            });

            days.push({
                date,
                dayName: format(date, 'EEEE', { locale: he }),
                dayNumber: format(date, 'd/M'),
                trainings: dayTrainings.sort((a, b) => {
                    const dateA = parseDateSafe(a.date) || new Date(0);
                    const dateB = parseDateSafe(b.date) || new Date(0);
                    return dateA - dateB;
                })
            });
        }
        return days;
    }, [trainings, selectedGroupId]); // Removed currentDate dependency

    const isLoading = trainingsLoading || eventsLoading;

    if (isLoading) return <Spinner.FullPage />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div>
                        <p className={styles.subtitle} style={{ marginBottom: '8px' }}>
                            קבוצה לתכנון:
                        </p>
                        <div className={styles.groupPillsContainer}>
                            <button
                                className={`${styles.groupPill} ${selectedGroupId === 'all' ? styles.active : ''}`}
                                onClick={() => setSelectedGroupId('all')}
                            >
                                כל הקבוצות
                            </button>
                            {groups.map(g => {
                                const groupColor = g.color || stringToColor(g.name);
                                const isActive = selectedGroupId === g.id;
                                return (
                                    <button
                                        key={g.id}
                                        className={`${styles.groupPill} ${isActive ? styles.active : ''}`}
                                        onClick={() => setSelectedGroupId(g.id)}
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
                                        {g.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* WEEKLY LIST VIEW (Now Top - Current Week) */}
            <div className={styles.weeklyListSection}>
                <div className={styles.weeklyListHeader}>
                    השבוע: {format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'dd/MM')} - {format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'dd/MM')}
                </div>

                {weekDays.map(day => {
                    const isToday = isSameDay(day.date, new Date());
                    return (
                        <div key={day.date.toString()} className={styles.dayListCard}>
                            <div className={`${styles.dayListHeader} ${isToday ? styles.today : ''}`}>
                                <span className={styles.dayListName}>{day.dayName}</span>
                                <span className={styles.dayListDate}>{day.dayNumber}</span>
                            </div>

                            <div className={styles.dayListContent}>
                                {day.trainings.length === 0 ? (
                                    <div
                                        className={styles.emptyDayMessage}
                                        onClick={() => handleDayClick(day.date)}
                                    >
                                        אין אימונים. לחץ להוספה +
                                    </div>
                                ) : (
                                    day.trainings.map(training => {
                                        const isCompleted = training.status === 'completed';
                                        // Safe date parsing
                                        const tDate = parseDateSafe(training.date);

                                        return (
                                            <div
                                                key={training.id}
                                                className={`${styles.listTrainingCard} ${isCompleted ? styles.performed : ''}`}
                                                style={{ '--indicator-color': TRAINING_TYPE_COLORS[training.type || 'technical'] }}
                                                onClick={() => openTrainingModal(training)}
                                            >
                                                {/* Checkbox for Status */}
                                                <div
                                                    className={styles.checkboxContainer}
                                                    onClick={(e) => handleToggleStatus(e, training)}
                                                >
                                                    <div className={`${styles.customCheckbox} ${isCompleted ? styles.checked : ''}`}>
                                                        {isCompleted && <Check size={12} />}
                                                    </div>
                                                </div>

                                                <div className={styles.cardTimeBox}>
                                                    <span className={styles.cardTime}>
                                                        {isNaN(tDate?.getTime()) ? '--:--' : format(tDate, 'HH:mm')}
                                                    </span>
                                                </div>
                                                <div className={styles.cardInfo}>
                                                    <span className={styles.cardTitle}>{training.topic || 'אימון'}</span>
                                                    <span className={styles.cardGroup}>
                                                        <Users size={12} /> {groups.find(g => g.id === training.groupId)?.name}
                                                    </span>
                                                    {training.executedBy && (
                                                        <span className={styles.executedByLabel}>
                                                            <Check size={10} /> בוצע ע"י {training.executedBy}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                {day.trainings.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDayClick(day.date)}
                                        style={{ fontSize: '11px', color: 'var(--primary-600)' }}
                                    >
                                        + הוסף אימון
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MONTHLY CALENDAR GRID (Now Bottom) */}
            <div className={styles.calendarContainer}>
                {/* Navigator Moved Here */}
                <div className={styles.monthNav} style={{ marginBottom: '16px', justifyContent: 'center' }}>
                    <button onClick={handlePrevious} className={styles.navButton}>
                        <ChevronRight size={24} />
                    </button>
                    <h2 className={styles.currentMonth} style={{ margin: '0 16px' }}>
                        {format(currentDate, 'MMMM yyyy', { locale: he })}
                    </h2>
                    <button onClick={handleNext} className={styles.navButton}>
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <div className={styles.weekHeaders}>
                    {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                        <div key={day} className={styles.weekHeader}>{day}</div>
                    ))}
                </div>
                <div className={styles.daysGrid}>
                    {monthDays.map((cell) => {
                        if (cell.type === 'empty') return <div key={cell.key} className={styles.emptyDay} />;
                        const isToday = isSameDay(cell.date, new Date());

                        return (
                            <div
                                key={cell.key}
                                className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
                                onClick={() => handleDayClick(cell.date)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className={styles.dayHeader}>
                                    <span className={styles.dayNumber}>{cell.day}</span>
                                </div>
                                <div className={styles.dayContent}>
                                    {/* Events (Prioritized) */}
                                    {cell.events.map(event => (
                                        <div
                                            key={event.id}
                                            className={styles.eventPill}
                                            style={{ backgroundColor: EVENT_COLORS[event.type] || EVENT_COLORS.OTHER }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Optional: Add event detail view or edit later
                                            }}
                                        >
                                            {event.title || 'אירוע'}
                                        </div>
                                    ))}

                                    {/* Trainings (Group Color + Time) */}
                                    {cell.trainings.map(training => {
                                        const group = groups.find(g => g.id === training.groupId);
                                        const color = group?.color || stringToColor(group?.name);
                                        // Safe date parsing
                                        const tDate = parseDateSafe(training.date);

                                        return (
                                            <div
                                                key={training.id}
                                                className={styles.trainingDot}
                                                style={{ backgroundColor: color, cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTrainingModal(training);
                                                }}
                                            >
                                                <span className={styles.timeText}>
                                                    {isNaN(tDate?.getTime()) ? '--:--' : format(tDate, 'HH:mm')}
                                                </span>
                                                <span className={styles.groupText}>
                                                    {group?.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Dynamic Legend based on Active Groups + Events */}
                <div className={styles.legendContainer}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', marginInlineStart: '8px' }}>מקרא:</span>

                    {/* Events Fixed */}
                    <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ backgroundColor: EVENT_COLORS.TOURNAMENT }} />
                        <span>טורניר/תחרות</span>
                    </div>

                    {/* Active Groups */}
                    {activeGroupsInMonth.slice(0, 5).map(g => (
                        <div key={g.id} className={styles.legendItem}>
                            <div className={styles.legendDot} style={{ backgroundColor: g.color || stringToColor(g.name) }} />
                            <span>{g.name}</span>
                        </div>
                    ))}
                    {activeGroupsInMonth.length > 5 && <span style={{ fontSize: '10px' }}>+{activeGroupsInMonth.length - 5} נוספים...</span>}
                </div>
            </div>

            {/* Day Details Modal */}
            {selectedDateModal && (
                <Modal
                    isOpen={!!selectedDateModal}
                    onClose={() => setSelectedDateModal(null)}
                    title={format(selectedDateModal, 'EEEE, d בMMMM', { locale: he })}
                >
                    <Modal.Body>
                        <div className={styles.modalContent}>
                            {/* Events Section */}
                            {events.filter(e => {
                                const eDate = parseDateSafe(e.startDate || e.date);
                                return eDate && isSameDay(eDate, selectedDateModal);
                            }).length > 0 && (
                                    <div className={styles.modalSection}>
                                        <h3 className={styles.modalSectionTitle}>אירועים</h3>
                                        {events.filter(e => {
                                            const eDate = parseDateSafe(e.startDate || e.date);
                                            return eDate && isSameDay(eDate, selectedDateModal);
                                        }).map(event => (
                                            <div
                                                key={event.id}
                                                className={styles.modalCard}
                                                style={{ borderInlineEnd: `4px solid ${EVENT_COLORS[event.type] || EVENT_COLORS.OTHER}` }}
                                            >
                                                <span style={{ fontWeight: 'bold' }}>{event.title}</span>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                    {EVENT_LABELS[event.type] || 'אירוע'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            {/* Trainings Section */}
                            <div className={styles.modalSection}>
                                <h3 className={styles.modalSectionTitle}>
                                    אימונים ({trainings.filter(t => {
                                        const tDate = parseDateSafe(t.date);
                                        return tDate && isSameDay(tDate, selectedDateModal);
                                    }).length})
                                </h3>

                                {trainings.filter(t => {
                                    const tDate = parseDateSafe(t.date);
                                    return tDate && isSameDay(tDate, selectedDateModal) && (selectedGroupId === 'all' || t.groupId === selectedGroupId);
                                }).length === 0 ? (
                                    <p className={styles.emptyText}>אין אימונים ביום זה</p>
                                ) : (
                                    trainings.filter(t => {
                                        const tDate = parseDateSafe(t.date);
                                        return tDate && isSameDay(tDate, selectedDateModal) && (selectedGroupId === 'all' || t.groupId === selectedGroupId);
                                    }).sort((a, b) => { // Sort by time
                                        const dateA = parseDateSafe(a.date) || new Date(0);
                                        const dateB = parseDateSafe(b.date) || new Date(0);
                                        return dateA - dateB;
                                    }).map(training => {
                                        const group = groups.find(g => g.id === training.groupId);
                                        const tDate = parseDateSafe(training.date);
                                        return (
                                            <div
                                                key={training.id}
                                                className={styles.modalCard}
                                                onClick={() => openTrainingModal(training)}
                                                style={{ cursor: 'pointer', borderInlineEnd: `4px solid ${group?.color || stringToColor(group?.name)}` }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{training.topic || 'אימון ללא נושא'}</span>
                                                    <span style={{ fontWeight: 'bold' }}>{format(tDate, 'HH:mm')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                                    <span>{group?.name}</span>
                                                    <StatusIndicator status={training.status === 'completed' ? 'completed' : 'planned'} showIcon={false} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            onClick={() => navigate(`/trainings/new?date=${selectedDateModal.toISOString()}&groupId=${selectedGroupId !== 'all' ? selectedGroupId : ''}`)}
                            fullWidth
                        >
                            + הוסף אימון חדש
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            <TrainingDetailsModal
                training={selectedTraining}
                isOpen={!!selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />
        </div>
    );
}

export default PlansList;
