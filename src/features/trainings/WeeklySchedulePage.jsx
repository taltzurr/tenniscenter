import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isToday
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
    ChevronRight,
    AlertCircle,
    Plus,
    Building2,
} from 'lucide-react';

import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useEventsStore from '../../stores/eventsStore';
import useGroupsStore from '../../stores/groupsStore';
import useUsersStore from '../../stores/usersStore';
import useCentersStore from '../../stores/centersStore';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import TrainingDetailsModal from '../dashboard/TrainingDetailsModal';
import { normalizeDate } from '../../utils/dateUtils';
import { isEventVisibleForCenter, EVENT_COLORS, EVENT_LABELS } from '../../services/events';
import EventDetailsModal from '../../components/ui/EventDetailsModal/EventDetailsModal';
import styles from './WeeklySchedulePage.module.css';

const stringToColor = (str) => {
    if (!str) return 'var(--text-secondary)';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default function WeeklySchedulePage() {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, editTraining, isLoading: isTrainingsLoading } = useTrainingsStore();
    const { events, fetchEvents, isLoading: isEventsLoading } = useEventsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { users, fetchUsers } = useUsersStore();
    const { centers, fetchCenters } = useCentersStore();
    const isCenterManager = userData?.role === 'centerManager';
    const isSupervisor = userData?.role === 'supervisor';
    const isViewOnly = isCenterManager || isSupervisor;
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedCenterIds, setSelectedCenterIds] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Calculate week range
    const today = useMemo(() => new Date(), []);
    const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
    const weekEnd = useMemo(() => endOfWeek(today, { weekStartsOn: 0 }), [today]);
    const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

    useEffect(() => {
        if (!userData?.id) return;

        fetchEvents(today.getFullYear(), today.getMonth());
        if (weekStart.getMonth() !== weekEnd.getMonth()) {
            fetchEvents(today.getFullYear(), weekEnd.getMonth());
        }

        if (isSupervisor) {
            fetchUsers();
            fetchCenters();
            fetchGroups(userData.id, false);
        } else if (isCenterManager) {
            fetchUsers();
            fetchCenters();
            fetchGroups(userData.id, false, userData.managedCenterId);
        } else {
            fetchGroups(userData.id);
            fetchTrainings(userData.id, weekStart, weekEnd);
        }
    }, [userData?.id, isCenterManager, isSupervisor]);

    // For center managers: fetch trainings for all center coaches once users are loaded
    useEffect(() => {
        if (!isCenterManager || !users || users.length === 0) return;
        const centerId = userData?.managedCenterId;
        const coachIds = users
            .filter(u => u.role === 'coach' && u.centerIds?.includes(centerId))
            .map(u => u.id);
        useTrainingsStore.getState().fetchCenterTrainings(coachIds, weekStart, weekEnd);
    }, [isCenterManager, users?.length]);

    // For supervisors: fetch trainings for ALL coaches once users are loaded
    useEffect(() => {
        if (!isSupervisor || !users || users.length === 0) return;
        const coachIds = users
            .filter(u => u.role === 'coach')
            .map(u => u.id);
        useTrainingsStore.getState().fetchCenterTrainings(coachIds, weekStart, weekEnd);
    }, [isSupervisor, users?.length]);

    // Map coachId → user object for name lookup
    const coachMap = useMemo(() => {
        if (!users) return {};
        return Object.fromEntries(users.filter(u => u.role === 'coach').map(u => [u.id, u]));
    }, [users]);

    // Map coachId → primary centerId
    const coachCenterMap = useMemo(() => {
        if (!users) return {};
        const map = {};
        users.filter(u => u.role === 'coach').forEach(u => {
            if (u.centerIds?.length > 0) {
                map[u.id] = u.centerIds[0];
            }
        });
        return map;
    }, [users]);

    const coachCenterId = userData?.centerIds?.[0] || userData?.managedCenterId || null;

    const visibleEvents = useMemo(() => {
        return events.filter(e => isEventVisibleForCenter(e, coachCenterId));
    }, [events, coachCenterId]);

    // Build filtered coach IDs based on selected centers
    const filteredCoachIds = useMemo(() => {
        if (!isViewOnly || !users) return null;

        if (isCenterManager) {
            const centerId = userData?.managedCenterId;
            return new Set(
                users.filter(u => u.role === 'coach' && u.centerIds?.includes(centerId)).map(u => u.id)
            );
        }

        if (isSupervisor && selectedCenterIds.length > 0) {
            const centerSet = new Set(selectedCenterIds);
            return new Set(
                users.filter(u => u.role === 'coach' && u.centerIds?.some(c => centerSet.has(c))).map(u => u.id)
            );
        }

        return null;
    }, [isViewOnly, isCenterManager, isSupervisor, selectedCenterIds, users, userData?.managedCenterId]);

    const toggleCenterFilter = (centerId) => {
        setSelectedCenterIds(prev =>
            prev.includes(centerId)
                ? prev.filter(id => id !== centerId)
                : [...prev, centerId]
        );
    };

    const getDayContent = (day) => {
        const dayEvents = visibleEvents.filter(e => {
            const d = e.date instanceof Date ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000) : normalizeDate(e.date));
            if (!d) return false;
            const startMatch = isSameDay(d, day);
            if (e.endDate) {
                const end = e.endDate instanceof Date ? e.endDate : new Date(e.endDate);
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59, 999);
                return startMatch || (dayStart >= d && dayStart <= end);
            }
            return startMatch;
        });

        const dayTrainings = trainings
            .filter(t => {
                if (!isViewOnly && selectedGroup !== 'all' && t.groupId !== selectedGroup) return false;
                if (filteredCoachIds && !filteredCoachIds.has(t.coachId)) return false;
                const d = normalizeDate(t.date);
                return isSameDay(d, day);
            })
            .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0));

        return { dayEvents, dayTrainings };
    };

    // Group trainings by center for manager views
    const groupTrainingsByCenter = (dayTrainings) => {
        const grouped = {};
        dayTrainings.forEach(t => {
            const centerId = coachCenterMap[t.coachId] || 'unknown';
            if (!grouped[centerId]) grouped[centerId] = [];
            grouped[centerId].push(t);
        });
        // Sort centers by name
        const sorted = Object.entries(grouped).sort((a, b) => {
            const nameA = getCenterName(a[0]);
            const nameB = getCenterName(b[0]);
            return nameA.localeCompare(nameB, 'he');
        });
        return sorted;
    };

    const getCenterName = (centerId) => {
        const center = centers.find(c => c.id === centerId);
        return center?.name || 'מרכז לא ידוע';
    };

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleStatusToggle = async (e, trainingId, currentStatus) => {
        e.stopPropagation();
        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        await editTraining(trainingId, { status: newStatus });
    };

    const handleTrainingClick = (training, day) => {
        const group = groups.find(g => g.id === training.groupId);
        const coach = coachMap[training.coachId];
        setSelectedTraining({
            ...training,
            coachName: coach?.displayName || training.coachName || '',
            group: group?.name || training.groupName || 'קבוצה',
            day: format(day, 'EEEE', { locale: he }),
            fullDate: format(day, 'd בMMMM', { locale: he }),
            time: format(normalizeDate(training.date), 'HH:mm'),
            duration: `${training.durationMinutes || 60} דק'`,
            location: training.location || 'מגרש ראשי'
        });
    };

    if (isTrainingsLoading || isEventsLoading) {
        return <Spinner.FullPage />;
    }

    const renderTrainingCard = (training, day) => {
        const group = groups.find(g => g.id === training.groupId);
        const coach = coachMap[training.coachId];
        const enrichedTraining = isViewOnly ? {
            ...training,
            coachName: coach?.displayName || training.coachName || '',
        } : training;

        return (
            <TrainingCard
                key={training.id}
                training={enrichedTraining}
                group={group}
                variant="compact"
                clickable
                toggleable
                showCoach={isViewOnly}
                hideLocation={isViewOnly}
                onClick={(t) => handleTrainingClick(t, day)}
                onStatusToggle={isViewOnly ? undefined : handleStatusToggle}
            />
        );
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <Button variant="ghost" onClick={handleBack} style={{ padding: '8px' }}>
                    <ChevronRight size={24} />
                    <span className={styles.backButtonLabel}>חזרה</span>
                </Button>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>אימוני השבוע</h1>
                    <p className={styles.subtitle}>
                        {format(weekStart, 'd.M', { locale: he })} - {format(weekEnd, 'd.M', { locale: he })}
                    </p>
                </div>
                {!isViewOnly && (
                    <Button onClick={() => navigate(`/trainings/new?date=${format(new Date(), 'yyyy-MM-dd')}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`)}>
                        <Plus size={20} />
                    </Button>
                )}
            </div>

            {/* Coach: Group Filter Chips */}
            {!isViewOnly && (
                <div className={`${styles.groupChips} hide-scrollbar`}>
                    <button
                        className={`${styles.filterChip} ${selectedGroup === 'all' ? styles.active : ''}`}
                        onClick={() => setSelectedGroup('all')}
                    >
                        <div className={styles.groupDot} style={{ backgroundColor: 'var(--text-secondary)' }} />
                        כל הקבוצות
                    </button>
                    {groups.map(group => {
                        const isActive = selectedGroup === group.id;
                        const color = group.color || stringToColor(group.name);
                        return (
                            <button
                                key={group.id}
                                className={`${styles.filterChip} ${isActive ? styles.active : ''}`}
                                style={isActive ? {
                                    borderColor: color,
                                    backgroundColor: `${color}10`,
                                    color: color
                                } : undefined}
                                onClick={() => setSelectedGroup(group.id)}
                            >
                                <div
                                    className={styles.groupDot}
                                    style={{ backgroundColor: isActive ? 'currentColor' : color }}
                                />
                                {group.name}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Supervisor: Center Filter Chips (multi-select) */}
            {isSupervisor && centers.length > 0 && (
                <div className={`${styles.groupChips} hide-scrollbar`}>
                    <button
                        className={`${styles.filterChip} ${selectedCenterIds.length === 0 ? styles.active : ''}`}
                        onClick={() => setSelectedCenterIds([])}
                    >
                        <Building2 size={14} />
                        כל המרכזים
                    </button>
                    {centers.map(center => {
                        const isActive = selectedCenterIds.includes(center.id);
                        return (
                            <button
                                key={center.id}
                                className={`${styles.filterChip} ${isActive ? styles.active : ''}`}
                                onClick={() => toggleCenterFilter(center.id)}
                            >
                                <Building2 size={14} />
                                {center.name}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className={styles.listContainer}>
                {days.map((day) => {
                    const { dayEvents, dayTrainings } = getDayContent(day);
                    const isTodayDay = isToday(day);
                    const hasContent = dayEvents.length > 0 || dayTrainings.length > 0;

                    return (
                        <div key={day.toISOString()} className={styles.daySection}>
                            <div className={styles.dayHeader}>
                                <span>{format(day, 'EEEE, d בMMMM', { locale: he })}</span>
                                {isTodayDay && <span className={styles.todayBadge}>היום</span>}
                            </div>

                            {/* Events */}
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    className={`${styles.eventCard} ${event.type === 'holiday' ? styles.eventCardHoliday : ''}`}
                                    onClick={() => setSelectedEvent(event)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <AlertCircle size={20} color={event.type === 'holiday' ? 'var(--error)' : 'var(--warning-text)'} />
                                    <div className={`${styles.eventTitle} ${event.type === 'holiday' ? styles.eventTitleHoliday : styles.eventTitleWarning}`}>
                                        {event.title}
                                    </div>
                                </div>
                            ))}

                            {/* Trainings - grouped by center for managers */}
                            {isViewOnly && dayTrainings.length > 0 ? (
                                groupTrainingsByCenter(dayTrainings).map(([centerId, centerTrainings]) => (
                                    <div key={centerId} className={styles.centerGroup}>
                                        <div className={styles.centerGroupHeader}>
                                            <Building2 size={14} />
                                            <span>{getCenterName(centerId)}</span>
                                        </div>
                                        {centerTrainings.map(training => renderTrainingCard(training, day))}
                                    </div>
                                ))
                            ) : (
                                dayTrainings.map(training => renderTrainingCard(training, day))
                            )}

                            {!hasContent && (
                                <div className={styles.emptyText}>אין פעילות</div>
                            )}

                            {!isViewOnly && (
                                <Button
                                    variant="ghost"
                                    className={styles.addTrainingButton}
                                    onClick={() => navigate(`/trainings/new?date=${format(day, 'yyyy-MM-dd')}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`)}
                                >
                                    <Plus size={16} /> הוסף אימון
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Training Details Modal */}
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
                centers={centers}
            />
        </div>
    );
}
