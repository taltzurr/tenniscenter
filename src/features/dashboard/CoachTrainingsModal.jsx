import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { normalizeDate } from '../../utils/dateUtils';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import TrainingDetailsModal from './TrainingDetailsModal';
import useGroupsStore from '../../stores/groupsStore';
import styles from './ManagerAnalyticsDashboard.module.css';

// Inline styles for Modal to avoid modifying CSS module too much if not needed, 
// or I can append to the module. Let's use inline for simplicity of this sub-component.
const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 'var(--space-5)'
    },
    content: {
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 'var(--radius-2xl)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--gray-100)'
    },
    header: {
        padding: 'var(--space-5)',
        borderBottom: '1px solid var(--gray-200)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    body: {
        padding: 'var(--space-5)',
        overflowY: 'auto'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
    },
    item: {
        padding: 'var(--space-3)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'background-color var(--transition-fast)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    itemHover: {
        backgroundColor: 'var(--gray-50)'
    },
    badge: {
        padding: '4px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 500
    }
};

const CoachTrainingsModal = ({ isOpen, onClose, coach, trainings }) => {
    const navigate = useNavigate();
    const { groups } = useGroupsStore();
    const [selectedTraining, setSelectedTraining] = useState(null);

    if (!isOpen || !coach) return null;

    // Filter trainings for this coach
    const coachTrainings = trainings
        .filter(t => t.coachId === coach.id)
        .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0));

    const handleTrainingClick = (training) => {
        const tDate = normalizeDate(training.date);
        const group = groups.find(g => g.id === training.groupId);
        setSelectedTraining({
            ...training,
            day: format(tDate, 'EEEE', { locale: he }),
            fullDate: format(tDate, 'd בMMMM', { locale: he }),
            time: format(tDate, 'HH:mm'),
            duration: `${training.durationMinutes || 60} דק'`,
            group: group?.name || training.groupName || 'קבוצה',
            location: training.location || 'מגרש ראשי',
        });
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
                <div style={modalStyles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar name={coach.name} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{coach.name}</h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                פירוט אימונים - {coachTrainings.length} סה"כ
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="סגור"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={24} color="var(--text-secondary)" />
                    </button>
                </div>

                <div style={modalStyles.body}>
                    {coachTrainings.length > 0 ? (
                        <div style={modalStyles.list}>
                            {coachTrainings.map(training => (
                                <TrainingCard
                                    key={training.id}
                                    training={training}
                                    variant="compact"
                                    clickable
                                    onClick={handleTrainingClick}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-secondary)' }}>
                            לא נמצאו אימונים למאמן זה בחודש הנוכחי
                        </div>
                    )}
                </div>
            </div>

            <TrainingDetailsModal
                training={selectedTraining}
                isOpen={!!selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />
        </div>
    );
};

export default CoachTrainingsModal;
