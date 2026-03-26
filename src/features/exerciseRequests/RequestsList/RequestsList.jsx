import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Calendar, Tag, MessageSquarePlus, Check, X, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../../stores/authStore';
import useExerciseRequestsStore from '../../../stores/exerciseRequestsStore';
import useExercisesStore from '../../../stores/exercisesStore';
import useUIStore from '../../../stores/uiStore';
import { STATUS_LABELS, REQUEST_STATUSES } from '../../../services/exerciseRequests';
import { EXERCISE_CATEGORIES } from '../../../services/exercises';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './RequestsList.module.css';

function RequestsList() {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { requests, fetchMyRequests, fetchAllRequests, updateStatus, isLoading } = useExerciseRequestsStore();
    const { addExercise } = useExercisesStore();
    const { addToast } = useUIStore();
    const [activeTab, setActiveTab] = useState('all');
    const [processingId, setProcessingId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');

    const isSupervisor = userData?.role === 'supervisor' || userData?.role === 'admin';

    useEffect(() => {
        if (userData?.id) {
            if (isSupervisor) {
                fetchAllRequests();
            } else {
                fetchMyRequests(userData.id);
            }
        }
    }, [userData, isSupervisor, fetchMyRequests, fetchAllRequests]);

    const filteredRequests = requests.filter(request => {
        if (activeTab === 'all') return true;
        return request.status === activeTab;
    });

    const getCategoryLabel = (value) => {
        const cat = EXERCISE_CATEGORIES.find(c => c.value === value);
        return cat ? `${cat.emoji} ${cat.label}` : value;
    };

    const handleApprove = async (request) => {
        setProcessingId(request.id);
        try {
            // Create the exercise from the request
            const exerciseData = {
                title: request.title,
                description: request.description || '',
                category: request.category || 'practice_games',
                difficulty: request.difficulty || 3,
                duration: request.duration || 15,
                ageGroups: request.ageGroup ? [request.ageGroup] : [],
                equipment: request.equipment || [],
                tags: request.tags || [],
                createdBy: request.requestedBy,
                createdByName: request.requestedByName || 'מאמן',
            };
            await addExercise(exerciseData);

            // Update request status to approved
            await updateStatus(request.id, REQUEST_STATUSES.APPROVED, 'אושר על ידי מנהל מקצועי');
            addToast({ type: 'success', message: `התרגיל "${request.title}" אושר ונוסף למאגר` });

            // Refresh
            fetchAllRequests();
        } catch (error) {
            console.error('Approve error:', error);
            addToast({ type: 'error', message: 'שגיאה באישור הבקשה' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (request) => {
        setProcessingId(request.id);
        try {
            await updateStatus(request.id, REQUEST_STATUSES.REJECTED, rejectNotes || 'נדחה על ידי מנהל מקצועי');
            addToast({ type: 'info', message: `הבקשה "${request.title}" נדחתה` });
            setRejectingId(null);
            setRejectNotes('');
            fetchAllRequests();
        } catch (error) {
            console.error('Reject error:', error);
            addToast({ type: 'error', message: 'שגיאה בדחיית הבקשה' });
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading && requests.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerRight}>
                    <button
                        className={styles.backButton}
                        onClick={() => navigate('/exercises')}
                        type="button"
                    >
                        <ArrowRight size={20} />
                    </button>
                    <h1 className={styles.title}>
                        {isSupervisor ? 'בקשות לתרגילים' : 'הבקשות שלי'}
                    </h1>
                </div>
                <Button size="small" onClick={() => navigate('/exercise-requests/new')}>
                    <Plus size={16} />
                    בקשה חדשה
                </Button>
            </div>

            {/* Status Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    הכל ({requests.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === REQUEST_STATUSES.PENDING ? styles.active : ''}`}
                    onClick={() => setActiveTab(REQUEST_STATUSES.PENDING)}
                >
                    ממתינים ({requests.filter(r => r.status === REQUEST_STATUSES.PENDING).length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === REQUEST_STATUSES.APPROVED ? styles.active : ''}`}
                    onClick={() => setActiveTab(REQUEST_STATUSES.APPROVED)}
                >
                    אושרו ({requests.filter(r => r.status === REQUEST_STATUSES.APPROVED).length})
                </button>
            </div>

            {/* Requests List */}
            {filteredRequests.length > 0 ? (
                <div className={styles.requestsList}>
                    {filteredRequests.map(request => (
                        <div key={request.id} className={`${styles.requestCard} ${styles[request.status]}`}>
                            <div className={styles.requestHeader}>
                                <h3 className={styles.requestTitle}>{request.title}</h3>
                                <span className={`${styles.statusBadge} ${styles[request.status]}`}>
                                    {STATUS_LABELS[request.status]}
                                </span>
                            </div>
                            <p className={styles.requestDescription}>
                                {request.description}
                            </p>
                            {request.reason && (
                                <p className={styles.requestReason}>
                                    <strong>סיבה:</strong> {request.reason}
                                </p>
                            )}
                            <div className={styles.requestMeta}>
                                {request.category && (
                                    <span className={styles.requestMetaItem}>
                                        <Tag size={14} />
                                        {getCategoryLabel(request.category)}
                                    </span>
                                )}
                                {request.createdAt && (
                                    <span className={styles.requestMetaItem}>
                                        <Calendar size={14} />
                                        {format(request.createdAt, 'd בMMMM yyyy', { locale: he })}
                                    </span>
                                )}
                                {isSupervisor && request.requestedByName && (
                                    <span className={styles.requestMetaItem}>
                                        מאת: {request.requestedByName}
                                    </span>
                                )}
                            </div>

                            {/* Supervisor actions for pending requests */}
                            {isSupervisor && request.status === REQUEST_STATUSES.PENDING && (
                                <div className={styles.actions}>
                                    {rejectingId === request.id ? (
                                        <div className={styles.rejectForm}>
                                            <textarea
                                                className={styles.rejectTextarea}
                                                placeholder="סיבת דחייה (אופציונלי)..."
                                                value={rejectNotes}
                                                onChange={(e) => setRejectNotes(e.target.value)}
                                            />
                                            <div className={styles.rejectActions}>
                                                <Button
                                                    size="small"
                                                    variant="outline"
                                                    onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                                                >
                                                    ביטול
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="danger"
                                                    disabled={processingId === request.id}
                                                    onClick={() => handleReject(request)}
                                                >
                                                    אשר דחייה
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                size="small"
                                                disabled={processingId === request.id}
                                                onClick={() => handleApprove(request)}
                                            >
                                                <Check size={16} />
                                                {processingId === request.id ? 'מאשר...' : 'אשר והוסף למאגר'}
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outline"
                                                disabled={processingId === request.id}
                                                onClick={() => setRejectingId(request.id)}
                                            >
                                                <X size={16} />
                                                דחה
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Show rejection notes */}
                            {request.status === REQUEST_STATUSES.REJECTED && request.statusNotes && (
                                <div className={styles.rejectionNote}>
                                    סיבת דחייה: {request.statusNotes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <MessageSquarePlus className={styles.emptyIcon} />
                    <h2 className={styles.emptyTitle}>אין בקשות עדיין</h2>
                    <p className={styles.emptyText}>
                        לא מצאת תרגיל שמתאים לך? שלח בקשה לתרגיל חדש
                    </p>
                    <Button onClick={() => navigate('/exercise-requests/new')}>
                        <Plus size={18} />
                        בקשה ראשונה
                    </Button>
                </div>
            )}
        </div>
    );
}

export default RequestsList;
