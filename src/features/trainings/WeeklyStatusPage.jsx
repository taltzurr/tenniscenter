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
import styles from './WeeklyStatusPage.module.css';

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
        <div className={styles.page}>
            <div className={styles.header}>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className={styles.backButton}>
                    <ArrowRight size={24} />
                    <span className={styles.backButtonText}>חזרה לראשי</span>
                </Button>
                <div>
                    <h1 className={styles.title}>{pageTitle}</h1>
                    <p className={styles.subtitle}>
                        {filteredTrainings.length} אימונים
                    </p>
                </div>
            </div>

            <div className={styles.listContainer}>
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
                    <div className={styles.emptyState}>
                        <CalendarDays size={48} className={styles.emptyIcon} />
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
