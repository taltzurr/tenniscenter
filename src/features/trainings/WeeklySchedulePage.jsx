import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    addDays,
    isToday
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
    ChevronRight,
    AlertCircle,
    Plus,
} from 'lucide-react';

import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useEventsStore from '../../stores/eventsStore';
import useGroupsStore from '../../stores/groupsStore';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import TrainingDetailsModal from '../dashboard/TrainingDetailsModal';
import { normalizeDate } from '../../utils/dateUtils';
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
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedTraining, setSelectedTraining] = useState(null);

    // Calculate week range
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Saturday
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    useEffect(() => {
        if (userData?.id) {
            fetchGroups(userData.id);
            fetchTrainings(userData.id, weekStart, weekEnd);
            fetchEvents(today.getFullYear(), today.getMonth());

            if (weekStart.getMonth() !== weekEnd.getMonth()) {
                fetchEvents(today.getFullYear(), weekEnd.getMonth());
            }
        }
    }, [userData, fetchTrainings, fetchEvents, fetchGroups]);

    const getDayContent = (day) => {
        const dayEvents = events.filter(e => {
            const d = normalizeDate(e.date);
            return isSameDay(d, day);
        });

        const dayTrainings = trainings
            .filter(t => {
                if (selectedGroup !== 'all' && t.groupId !== selectedGroup) return false;
                const d = normalizeDate(t.date);
                return isSameDay(d, day);
            })
            .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0));

        return { dayEvents, dayTrainings };
    };

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleStatusToggle = async (e, trainingId, currentStatus) => {
        e.stopPropagation();
        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        await editTraining(trainingId, { status: newStatus });
    };

    if (isTrainingsLoading || isEventsLoading) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <Button variant="ghost" onClick={handleBack} style={{ padding: '8px' }}>
                    <ChevronRight size={24} />
                    <span className={styles.backButtonLabel}>חזרה</span>
                </Button>
                <div>
                    <h1 className={styles.title}>אימוני השבוע</h1>
                    <p className={styles.subtitle}>
                        {format(weekStart, 'd.M', { locale: he })} - {format(weekEnd, 'd.M', { locale: he })}
                    </p>
                </div>
                <Button onClick={() => navigate(`/trainings/new?date=${format(new Date(), 'yyyy-MM-dd')}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`)}>
                    <Plus size={20} />
                </Button>
            </div>

            {/* Group Filter */}
            <div className={`${styles.groupChips} hide-scrollbar`}>
                <button
                    className={`${styles.filterChip} ${selectedGroup === 'all' ? styles.active : ''}`}
                    onClick={() => setSelectedGroup('all')}
                >
                    <div
                        className={styles.groupDot}
                        style={{ backgroundColor: 'var(--text-secondary)' }}
                    />
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
                                >
                                    <AlertCircle size={20} color={event.type === 'holiday' ? 'var(--error)' : 'var(--warning-text)'} />
                                    <div className={`${styles.eventTitle} ${event.type === 'holiday' ? styles.eventTitleHoliday : styles.eventTitleWarning}`}>
                                        {event.title}
                                    </div>
                                </div>
                            ))}

                            {/* Trainings */}
                            {dayTrainings.map(training => {
                                const group = groups.find(g => g.id === training.groupId);
                                return (
                                    <TrainingCard
                                        key={training.id}
                                        training={training}
                                        group={group}
                                        variant="compact"
                                        clickable
                                        toggleable
                                        onClick={(t) => setSelectedTraining({
                                            ...t,
                                            group: group?.name || t.groupName || 'קבוצה',
                                            day: format(day, 'EEEE', { locale: he }),
                                            fullDate: format(day, 'd בMMMM', { locale: he }),
                                            time: format(normalizeDate(t.date), 'HH:mm'),
                                            duration: `${t.durationMinutes || 60} דק'`,
                                            location: t.location || 'מגרש ראשי'
                                        })}
                                        onStatusToggle={handleStatusToggle}
                                    />
                                );
                            })}

                            {!hasContent && (
                                <div className={styles.emptyText}>אין פעילות</div>
                            )}

                            <Button
                                variant="ghost"
                                className={styles.addTrainingButton}
                                onClick={() => navigate(`/trainings/new?date=${format(day, 'yyyy-MM-dd')}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`)}
                            >
                                <Plus size={16} /> הוסף אימון
                            </Button>
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
        </div>
    );
}
