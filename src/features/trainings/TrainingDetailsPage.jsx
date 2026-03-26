import { useEffect, useState } from 'react';
import { getUserData } from '../../services/auth';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    Activity,
    FileText,
    CheckCircle,
    ChevronRight,
    Edit2,
    Repeat
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import { fetchSeriesTrainings } from '../../services/trainings';
import useTrainingsStore from '../../stores/trainingsStore';
import useGroupsStore from '../../stores/groupsStore';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Comments from '../../components/ui/Comments/Comments';

const styles = {
    page: {
        padding: 'var(--space-6)',
        maxWidth: '800px',
        margin: '0 auto',
        minHeight: '100vh',
    },
    header: {
        marginBottom: 'var(--space-6)',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: 'var(--font-size-sm)',
        marginBottom: 'var(--space-4)',
        background: 'none',
        border: 'none',
        padding: 0,
    },
    card: {
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 'var(--space-6)',
        borderBottom: '1px solid var(--gray-100)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        backgroundColor: 'var(--gray-50)',
    },
    title: {
        fontSize: 'var(--font-size-2xl)',
        fontWeight: '800',
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-1)',
    },
    subtitle: {
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-lg)',
    },
    content: {
        padding: 'var(--space-6)',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: '600',
        backgroundColor: 'var(--primary-50)',
        color: 'var(--primary-700)',
    },
    statusCompleted: {
        backgroundColor: 'var(--success-bg)',
        color: 'var(--success)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
    },
    gridItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
    },
    gridIcon: {
        color: 'var(--primary-500)',
        marginTop: '2px',
    },
    label: {
        display: 'block',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-tertiary)',
        marginBottom: '2px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    value: {
        fontSize: 'var(--font-size-md)',
        color: 'var(--text-primary)',
        fontWeight: '500',
    },
    section: {
        marginTop: 'var(--space-6)',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--gray-50)',
        borderRadius: 'var(--radius-lg)',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: 'var(--font-size-md)',
        fontWeight: '700',
        marginBottom: 'var(--space-3)',
        color: 'var(--text-secondary)',
    },
    description: {
        lineHeight: '1.6',
        color: 'var(--text-secondary)',
    },
    footer: {
        padding: 'var(--space-6)',
        borderTop: '1px solid var(--gray-100)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        backgroundColor: 'var(--bg-primary)',
    }
};

export default function TrainingDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { trainings, fetchTraining, editTraining, isLoading } = useTrainingsStore();
    const { groups } = useGroupsStore();
    const [training, setTraining] = useState(null);
    const [coachName, setCoachName] = useState('---');
    const [seriesCount, setSeriesCount] = useState(null);

    // Safe derivation of group for use in effects
    const group = training ? groups.find(g => g.id === training.groupId) : null;
    const dateObj = training ? new Date(training.date) : new Date();

    useEffect(() => {
        const loadCoachName = async () => {
            if (!training) return;
            // ... (rest of logic is fine, using group which is now defined)
            // 1. Try name from training snapshot
            if (training.coachName) {
                setCoachName(training.coachName);
                return;
            }

            // 2. Try fetching by coachId from training or group
            const idToFetch = training.coachId || group?.coachId;
            if (idToFetch) {
                try {
                    const user = await getUserData(idToFetch);
                    if (user?.displayName) {
                        setCoachName(user.displayName);
                    }
                } catch (error) {
                    console.error("Failed to fetch coach name", error);
                }
            }
        };

        loadCoachName();
    }, [training, group]);

    useEffect(() => {
        if (training?.recurrenceGroupId) {
            fetchSeriesTrainings(training.recurrenceGroupId)
                .then(series => setSeriesCount(series.length))
                .catch(() => setSeriesCount(null));
        }
    }, [training?.recurrenceGroupId]);

    useEffect(() => {
        // Try finding in current store state first
        const found = trainings.find(t => t.id === id);
        if (found) {
            setTraining(found);
        } else {
            // Fetch if not found (assuming fetchTraining exists, or just fetch all? Store usually fetches all by date range)
            // For now, let's assume if it's not in store we might need to fetch it specifically or handle error.
            // But since the user likely navigated from a list, it should be there. 
            // If explicit fetch is needed, implement it. 
            // Looking at store: fetchTrainings is range based. 
            // We can treat this as "if not found, maybe show loading or error"
        }
    }, [id, trainings]);

    if (!training) {
        // Check if trainings have been loaded (store has data)
        const hasLoadedData = trainings.length > 0;

        if (hasLoadedData) {
            return (
                <div style={{ padding: 'var(--space-10)', textAlign: 'center', direction: 'rtl' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
                        אימון לא נמצא
                    </p>
                    <Button variant="outline" onClick={() => navigate('/weekly-schedule')}>
                        חזרה ללוח האימונים
                    </Button>
                </div>
            );
        }

        return (
            <div style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
                <Spinner />
            </div>
        );
    }



    const handleBack = () => {
        navigate('/weekly-schedule'); // Or -1, but explicit is safer for "Back to Main Screen" if that means schedule
    };

    const handleEdit = () => {
        navigate(`/trainings/${id}/edit`);
    };

    const handleStatusToggle = async () => {
        const newStatus = training.status === 'completed' ? 'planned' : 'completed';
        try {
            await editTraining(id, { status: newStatus });
            setTraining(prev => ({ ...prev, status: newStatus }));
        } catch (err) {
            console.error('Failed to toggle training status:', err);
        }
    };

    return (
        <div style={styles.page}>
            <button style={styles.backButton} onClick={handleBack}>
                <ChevronRight size={16} />
                חזרה ללוח האימונים
            </button>

            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div>
                        <h1 style={styles.title}>{group?.name || training.groupName || 'קבוצה לא ידועה'}</h1>
                        <span style={styles.subtitle}>
                            {format(dateObj, 'EEEE, d בMMMM yyyy', { locale: he })}
                        </span>
                    </div>
                    <div style={{
                        ...styles.statusBadge,
                        ...(training.status === 'completed' ? styles.statusCompleted : {})
                    }}>
                        {training.status === 'completed' ? (
                            <>
                                <CheckCircle size={16} />
                                <span>בוצע</span>
                            </>
                        ) : (
                            <>
                                <Clock size={16} />
                                <span>מתוכנן</span>
                            </>
                        )}
                    </div>
                </div>

                <div style={styles.content}>
                    <div style={styles.grid}>
                        <div style={styles.gridItem}>
                            <Clock size={20} style={styles.gridIcon} />
                            <div>
                                <label style={styles.label}>שעה</label>
                                <div style={styles.value}>
                                    {format(dateObj, 'HH:mm')} ({training.durationMinutes || 60} דק')
                                </div>
                            </div>
                        </div>

                        <div style={styles.gridItem}>
                            <MapPin size={20} style={styles.gridIcon} />
                            <div>
                                <label style={styles.label}>מיקום</label>
                                <div style={styles.value}>{training.location || 'מגרש ראשי'}</div>
                            </div>
                        </div>

                        <div style={styles.gridItem}>
                            <Users size={20} style={styles.gridIcon} />
                            <div>
                                <label style={styles.label}>מאמן</label>
                                <div style={styles.value}>{coachName}</div>
                            </div>
                        </div>

                        <div style={styles.gridItem}>
                            <Activity size={20} style={styles.gridIcon} />
                            <div>
                                <label style={styles.label}>נושא</label>
                                <div style={styles.value}>{training.topic || 'כללי'}</div>
                            </div>
                        </div>
                    </div>

                    {training.description && (
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>
                                <FileText size={18} />
                                <span>תיאור האימון</span>
                            </div>
                            <p style={styles.description}>{training.description}</p>
                        </div>
                    )}

                    {training.recurrenceGroupId && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3) var(--space-4)',
                            backgroundColor: 'var(--primary-50)',
                            borderRadius: 'var(--radius-md)',
                            marginTop: 'var(--space-4)',
                            border: '1px solid var(--primary-100)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--primary-700)',
                            fontWeight: 500
                        }}>
                            <Repeat size={16} />
                            <span>חלק מסדרה חוזרת{seriesCount ? ` (${seriesCount} אימונים)` : ''}</span>
                        </div>
                    )}

                    {/* Professional Feedback Section */}
                    <div style={styles.section}>
                        <Comments
                            entityType="training"
                            entityId={training.id}
                            title="משוב מקצועי והערות"
                        />
                    </div>
                </div>

                <div style={styles.footer}>
                    <Button variant="outline" onClick={handleStatusToggle}>
                        {training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                    </Button>
                    <Button onClick={handleEdit}>
                        <Edit2 size={18} style={{ marginInlineStart: '8px' }} />
                        ערוך אימון
                    </Button>
                </div>
            </div>
        </div>
    );
}
