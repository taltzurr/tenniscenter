import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    format,
    startOfWeek,
    endOfWeek,
    isSameDay
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
    MapPin,
    ChevronRight,
    CheckCircle,
    Check,
    Calendar,
    CalendarDays,
    ArrowRight
} from 'lucide-react';

import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrainingDetailsModal from '../dashboard/TrainingDetailsModal';

const styles = {
    page: {
        padding: 'var(--space-4)',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-6)',
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
        gap: 'var(--space-3)',
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
    },
    cardContent: {
        flex: 1,
        minWidth: 0,
    },
    dateBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '60px',
        paddingRight: 'var(--space-3)',
        borderRight: '1px solid var(--gray-100)',
        color: 'var(--text-primary)',
        textAlign: 'center',
    },
    dayName: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
        marginBottom: '2px',
    },
    timeValue: {
        fontSize: '1rem',
        fontWeight: '700',
        lineHeight: 1,
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
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12)',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
    }
};

export default function WeeklyStatusPage({ status }) {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, editTraining, isLoading } = useTrainingsStore();
    const { groups, fetchGroups } = useGroupsStore();

    const [selectedTraining, setSelectedTraining] = useState(null);
    const isCompletedView = status === 'completed';
    const pageTitle = isCompletedView ? 'בוצעו השבוע' : 'ממתינים השבוע';
    const emptyMessage = isCompletedView ? 'אין אימונים שבוצעו השבוע' : 'אין אימונים ממתינים השבוע';

    const { weekStart, weekEnd } = useMemo(() => {
        const today = new Date();
        return {
            weekStart: startOfWeek(today, { weekStartsOn: 0 }),
            weekEnd: endOfWeek(today, { weekStartsOn: 0 })
        };
    }, []);

    useEffect(() => {
        if (userData?.id) {
            fetchGroups(userData.id);
            // Map UI status to DB status
            // 'pending' in UI -> 'planned' in DB
            // 'completed' in UI -> 'completed' in DB
            const dbStatus = status === 'pending' ? 'planned' : status;
            fetchTrainings(userData.id, weekStart, weekEnd, dbStatus);
        }
    }, [userData, fetchTrainings, fetchGroups, status, weekStart, weekEnd]);

    const filteredTrainings = trainings
        .filter(t => {
            const isCompleted = t.status === 'completed';
            return isCompletedView ? isCompleted : !isCompleted;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const handleStatusToggle = async (e, trainingId, currentStatus) => {
        e.stopPropagation();
        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        await editTraining(trainingId, { status: newStatus });
    };

    if (isLoading) return <Spinner.FullPage />;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} style={{ padding: '8px', gap: '8px' }}>
                    <ArrowRight size={24} />
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>חזרה לראשי</span>
                </Button>
                <div>
                    <h1 style={styles.title}>{pageTitle}</h1>
                    <p style={styles.subtitle}>
                        {filteredTrainings.length} אימונים
                    </p>
                </div>
            </div>

            <div style={styles.listContainer}>
                {filteredTrainings.length > 0 ? (
                    filteredTrainings.map(training => {
                        const group = groups.find(g => g.id === training.groupId);
                        const dateObj = new Date(training.date);

                        return (
                            <div
                                key={training.id}
                                style={styles.card}
                                onClick={() => {
                                    const tDate = new Date(training.date);
                                    setSelectedTraining({
                                        ...training,
                                        day: format(tDate, 'EEEE', { locale: he }),
                                        fullDate: format(tDate, 'd בMMMM', { locale: he }),
                                        time: format(tDate, 'HH:mm'),
                                        duration: `${training.durationMinutes || 60} דק'`,
                                        group: group?.name || training.groupName || 'קבוצה',
                                        location: training.location || 'מגרש ראשי',
                                    });
                                }}
                            >
                                <div style={styles.dateBox}>
                                    <span style={styles.dayName}>{format(dateObj, 'EEE', { locale: he })}</span>
                                    <span style={styles.timeValue}>{format(dateObj, 'HH:mm')}</span>
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
                    })
                ) : (
                    <div style={styles.emptyState}>
                        <CalendarDays size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>{emptyMessage}</p>
                    </div>
                )}
            </div>

            <TrainingDetailsModal
                training={selectedTraining}
                isOpen={!!selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />
        </div>
    );
}
