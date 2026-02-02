import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Calendar, Tag, MessageSquarePlus } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../../stores/authStore';
import useExerciseRequestsStore from '../../../stores/exerciseRequestsStore';
import { STATUS_LABELS, REQUEST_STATUSES } from '../../../services/exerciseRequests';
import { EXERCISE_CATEGORIES } from '../../../services/exercises';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './RequestsList.module.css';

function RequestsList() {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { requests, fetchMyRequests, fetchAllRequests, isLoading } = useExerciseRequestsStore();
    const [activeTab, setActiveTab] = useState('all');

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
        return cat?.label || value;
    };

    if (isLoading && requests.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    {isSupervisor ? 'בקשות לתרגילים' : 'הבקשות שלי'}
                </h1>
                <Button onClick={() => navigate('/exercise-requests/new')}>
                    <Plus size={18} />
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
