import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
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
        zIndex: 1000,
        padding: '20px'
    },
    content: {
        backgroundColor: 'white',
        borderRadius: '24px', // More modern
        width: '90%', // Reactive width for mobile
        maxWidth: '600px', // Cap for desktop
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // Better shadow
        border: '1px solid rgba(255,255,255,0.1)'
    },
    header: {
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    body: {
        padding: '20px',
        overflowY: 'auto'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    item: {
        padding: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    itemHover: {
        backgroundColor: '#f9fafb'
    },
    badge: {
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '12px',
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
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const handleTrainingClick = (training) => {
        const tDate = training.date instanceof Date ? training.date : new Date(training.date);
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
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                                פירוט אימונים - {coachTrainings.length} סה"כ
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                        <X size={24} color="#6b7280" />
                    </button>
                </div>

                <div style={modalStyles.body}>
                    {coachTrainings.length > 0 ? (
                        <div style={modalStyles.list}>
                            {coachTrainings.map(training => (
                                <div
                                    key={training.id}
                                    style={modalStyles.item}
                                    onClick={() => handleTrainingClick(training)}
                                // Note: Hover state handling in inline styles is tricky without state,
                                // but we accept standard look for now.
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <Calendar size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 500 }}>
                                                {format(training.date, 'dd/MM/yyyy')}
                                            </span>
                                            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                                | {format(training.date, 'HH:mm')}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                                            {training.groupName || 'קבוצה'} • {training.location || 'מיקום לא צוין'}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{
                                            ...modalStyles.badge,
                                            backgroundColor: training.status === 'completed' ? '#dcfce7' : '#f3f4f6',
                                            color: training.status === 'completed' ? '#166534' : '#4b5563'
                                        }}>
                                            {training.status === 'completed' ? 'בוצע' : 'ממתין'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
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
