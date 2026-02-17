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
    CalendarDays,
    ArrowRight
} from 'lucide-react';

import useAuthStore from '../../stores/authStore';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import { normalizeDate } from '../../utils/dateUtils';
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
        paddingInlineEnd: 'var(--space-3)',
        borderInlineEnd: '1px solid var(--gray-100)',
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
        .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0));

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

                        return (
                            <TrainingCard
                                key={training.id}
                                training={training}
                                group={group}
                                variant="compact"
                                clickable
                                toggleable
                                onClick={(t) => {
                                    const tDate = normalizeDate(t.date);
                                    setSelectedTraining({
                                        ...t,
                                        day: format(tDate, 'EEEE', { locale: he }),
                                        fullDate: format(tDate, 'd בMMMM', { locale: he }),
                                        time: format(tDate, 'HH:mm'),
                                        duration: `${t.durationMinutes || 60} דק'`,
                                        group: group?.name || t.groupName || 'קבוצה',
                                        location: t.location || 'מגרש ראשי',
                                    });
                                }}
                                onStatusToggle={handleStatusToggle}
                            />
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
