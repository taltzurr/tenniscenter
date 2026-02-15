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
    Calendar,
    Clock,
    MapPin,
    Users,
    ChevronRight,
    AlertCircle,
    Info,
    CheckCircle,
    Check,
    Plus,
    Filter
} from 'lucide-react';

import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useEventsStore from '../../stores/eventsStore';
import useGroupsStore from '../../stores/groupsStore';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import classes from './WeeklySchedulePage.module.css';

// Unified styles for list view
const styles = {
    page: {
        padding: 'var(--space-4)',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        paddingBottom: '80px' // Space for mobile nav if needed
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-secondary)',
        zIndex: 10,
        paddingTop: 'var(--space-2)',
        paddingBottom: 'var(--space-2)',
    },
    title: {
        fontSize: 'var(--font-size-xl)',
        fontWeight: '800',
        color: 'var(--text-primary)',
        marginBottom: '2px',
    },
    subtitle: {
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-sm)',
    },
    listContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
    },
    daySection: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
    },
    dayHeader: {
        fontSize: 'var(--font-size-md)',
        fontWeight: '700',
        color: 'var(--text-secondary)',
        padding: '0 var(--space-1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    todayBadge: {
        fontSize: '0.75rem',
        backgroundColor: 'var(--primary-100)',
        color: 'var(--primary-700)',
        padding: '2px 8px',
        borderRadius: '12px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        border: '1px solid var(--gray-100)',
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
    },
    cardContent: {
        flex: 1,
        minWidth: 0, // Text truncation fix
    },
    trainingTime: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '50px',
        paddingRight: 'var(--space-3)',
        borderRight: '1px solid var(--gray-100)',
        color: 'var(--text-primary)',
    },
    timeValue: {
        fontSize: '1rem',
        fontWeight: '700',
        lineHeight: 1,
    },
    durationValue: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
        marginTop: '2px',
    },
    groupName: {
        fontWeight: '600',
        fontSize: 'var(--font-size-md)',
        color: 'var(--text-primary)',
        marginBottom: '2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    location: {
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    statusIcon: {
        color: 'var(--gray-300)',
    },
    completedIcon: {
        color: 'var(--success)',
    },
    eventCard: {
        backgroundColor: 'var(--warning-bg)',
        border: '1px solid var(--warning-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
    },
    emptyText: {
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        padding: 'var(--space-4)',
        fontSize: 'var(--font-size-sm)',
    },
    filterContainer: {
        marginBottom: 'var(--space-4)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        display: 'flex',
        gap: '8px',
        paddingBottom: '4px',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none',  // IE 10+
        WebkitOverflowScrolling: 'touch',
    },
    filterChip: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: '9999px',
        fontSize: '0.85rem',
        border: '1px solid var(--gray-200)',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        gap: '6px',
        transition: 'all 0.2s ease',
    },
    filterChipActive: {
        backgroundColor: 'var(--primary-50)',
        borderColor: 'var(--primary-500)',
        color: 'var(--primary-700)',
        fontWeight: '600',
    },
    dot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
    }
};

const stringToColor = (str) => {
    if (!str) return '#6b7280';
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
            const d = e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date);
            return isSameDay(d, day);
        });

        const dayTrainings = trainings
            .filter(t => {
                if (selectedGroup !== 'all' && t.groupId !== selectedGroup) return false;
                const d = new Date(t.date);
                return isSameDay(d, day);
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

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
        <div style={styles.page}>
            <div style={styles.header}>
                <Button variant="ghost" onClick={handleBack} style={{ padding: '8px' }}>
                    <ChevronRight size={24} />
                    <span style={{ display: 'none' }}>חזרה</span>
                </Button>
                <div>
                    <h1 style={styles.title}>אימוני השבוע</h1>
                    <p style={styles.subtitle}>
                        {format(weekStart, 'd.M', { locale: he })} - {format(weekEnd, 'd.M', { locale: he })}
                    </p>
                </div>
                <Button onClick={() => navigate(`/trainings/new?date=${format(new Date(), 'yyyy-MM-dd')}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`)}>
                    <Plus size={20} />
                </Button>
            </div>

            {/* Group Filter */}
            <div className={`${classes.groupChips} hide-scrollbar`}>
                <button
                    className={`${classes.filterChip} ${selectedGroup === 'all' ? classes.active : ''}`}
                    onClick={() => setSelectedGroup('all')}
                >
                    <div
                        className={classes.groupDot}
                        style={{ backgroundColor: '#6b7280' }}
                    />
                    כל הקבוצות
                </button>
                {groups.map(group => {
                    const isActive = selectedGroup === group.id;
                    const color = group.color || stringToColor(group.name);
                    return (
                        <button
                            key={group.id}
                            className={`${classes.filterChip} ${isActive ? classes.active : ''}`}
                            style={isActive ? {
                                borderColor: color,
                                backgroundColor: `${color}10`,
                                color: color
                            } : undefined}
                            onClick={() => setSelectedGroup(group.id)}
                        >
                            <div
                                className={classes.groupDot}
                                style={{ backgroundColor: isActive ? 'currentColor' : color }}
                            />
                            {group.name}
                        </button>
                    );
                })}
            </div>

            <div style={styles.listContainer}>
                {days.map((day) => {
                    const { dayEvents, dayTrainings } = getDayContent(day);
                    const isTodayDay = isToday(day);
                    const hasContent = dayEvents.length > 0 || dayTrainings.length > 0;

                    // Skip empty days? User said "show rows... like dashboard". 
                    // Dashboard usually shows "Next days". 
                    // Let's show all days so they can see emptiness or add? 
                    // The user said "weekly view... rows... like dashboard".
                    // Let's show all days for structure.

                    return (
                        <div key={day.toISOString()} style={styles.daySection}>
                            <div style={styles.dayHeader}>
                                <span>{format(day, 'EEEE, d בMMMM', { locale: he })}</span>
                                {isTodayDay && <span style={styles.todayBadge}>היום</span>}
                            </div>

                            {/* Events */}
                            {dayEvents.map(event => (
                                <div key={event.id} style={{
                                    ...styles.eventCard,
                                    backgroundColor: event.type === 'holiday' ? 'var(--error-bg)' : 'var(--warning-bg)',
                                    borderColor: event.type === 'holiday' ? 'var(--error-border)' : 'var(--warning-border)',
                                }}>
                                    <AlertCircle size={20} color={event.type === 'holiday' ? 'var(--error)' : 'var(--warning-text)'} />
                                    <div style={{ color: event.type === 'holiday' ? 'var(--error)' : 'var(--warning-text)', fontWeight: '600', fontSize: '0.9rem' }}>
                                        {event.title}
                                    </div>
                                </div>
                            ))}

                            {/* Trainings */}
                            {dayTrainings.map(training => {
                                const group = groups.find(g => g.id === training.groupId);
                                return (
                                    <div
                                        key={training.id}
                                        style={styles.card}
                                        onClick={() => navigate(`/trainings/${training.id}`)}
                                    >
                                        <div style={styles.trainingTime}>
                                            <span style={styles.timeValue}>{format(new Date(training.date), 'HH:mm')}</span>
                                            <span style={styles.durationValue}>{training.durationMinutes || 60} דק'</span>
                                        </div>

                                        <div style={styles.cardContent}>
                                            <div style={styles.groupName}>
                                                {group?.name || training.groupName || 'קבוצה'}
                                            </div>
                                            <div style={styles.location}>
                                                <MapPin size={14} />
                                                {training.location || 'מגרש ראשי'}
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => handleStatusToggle(e, training.id, training.status)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '9999px',
                                                background: training.status === 'completed' ? '#dcfce7' : 'var(--gray-100)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: training.status === 'completed' ? '#16a34a' : '#9ca3af',
                                                transition: 'all 0.2s ease',
                                                transform: training.status === 'completed' ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                            title={training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                                        >
                                            {training.status === 'completed' ? <CheckCircle size={20} /> : <CheckCircle size={20} />}
                                        </button>
                                    </div>
                                );
                            })}

                            {!hasContent && (
                                <div style={styles.emptyText}>אין פעילות</div>
                            )}

                            <Button
                                variant="ghost"
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--gray-50)',
                                    color: 'var(--primary-600)',
                                    border: '1px dashed var(--gray-200)',
                                    height: '40px'
                                }}
                                onClick={() => navigate(`/trainings/new?date=${format(day, 'yyyy-MM-dd')}&groupId=${selectedGroup !== 'all' ? selectedGroup : ''}`)}
                            >
                                <Plus size={16} /> הוסף אימון
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
