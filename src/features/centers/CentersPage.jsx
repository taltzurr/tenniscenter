import { useEffect, useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Users, Layers, Eye, AlertTriangle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal/Modal';
import Spinner from '../../components/ui/Spinner';
import useCentersStore from '../../stores/centersStore';
import useGroupsStore from '../../stores/groupsStore';
import useUsersStore from '../../stores/usersStore';
import useUIStore from '../../stores/uiStore';
import useAuthStore from '../../stores/authStore';
import CenterFormModal from './CenterFormModal';
import styles from './CentersPage.module.css';

function CentersPage() {
    const navigate = useNavigate();
    const { isSupervisor } = useAuthStore();
    const { centers, isLoading, fetchCenters, addCenter, updateCenter, deleteCenter } = useCentersStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { users, fetchUsers } = useUsersStore();
    const { addToast } = useUIStore();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation modal state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const authorized = isSupervisor();

    useEffect(() => {
        if (authorized) {
            fetchCenters();
            fetchGroups(null, true);
            fetchUsers();
        }
    }, [fetchCenters, fetchGroups, fetchUsers, authorized]);

    // Defense-in-depth: route is already protected by RoleRoute
    if (!authorized) return <Navigate to="/dashboard" replace />;

    // Calculate stats per center
    const centerStats = useMemo(() => {
        const stats = {};
        centers.forEach(center => {
            const centerGroups = groups.filter(g => g.centerId === center.id && g.isActive !== false);
            const centerCoaches = users.filter(u =>
                u.role === 'coach' &&
                u.isActive !== false &&
                (Array.isArray(u.centerIds) ? u.centerIds.includes(center.id) : u.centerId === center.id)
            );
            stats[center.id] = {
                groupsCount: centerGroups.length,
                coachesCount: centerCoaches.length,
            };
        });
        return stats;
    }, [centers, groups, users]);

    const handleAddCenter = () => {
        setSelectedCenter(null);
        setIsFormOpen(true);
    };

    const handleEditCenter = (e, center) => {
        e.stopPropagation();
        setSelectedCenter(center);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (e, center) => {
        e.stopPropagation();
        setDeleteTarget(center);
        setDeleteConfirmText('');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;

        setIsDeleting(true);
        const result = await deleteCenter(deleteTarget.id);
        setIsDeleting(false);

        if (result.success) {
            addToast({ type: 'success', message: 'המרכז נמחק בהצלחה' });
            setDeleteTarget(null);
            setDeleteConfirmText('');
        } else {
            addToast({ type: 'error', message: result.error });
        }
    };

    const handleDeleteCancel = () => {
        setDeleteTarget(null);
        setDeleteConfirmText('');
    };

    const handleCardClick = (center) => {
        navigate(`/center-manager-view/${center.id}`);
    };

    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        let result;

        if (selectedCenter) {
            result = await updateCenter(selectedCenter.id, formData);
        } else {
            result = await addCenter(formData);
        }

        setIsSubmitting(false);

        if (result.success) {
            addToast({ type: 'success', message: selectedCenter ? 'המרכז עודכן בהצלחה' : 'המרכז נוצר בהצלחה' });
            setIsFormOpen(false);
        } else {
            addToast({ type: 'error', message: result.error });
        }
    };

    if (isLoading && centers.length === 0) {
        return <Spinner.FullPage />;
    }

    const isDeleteNameMatch = deleteTarget && deleteConfirmText === deleteTarget.name;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>ניהול מרכזים</h1>
                    <span className={styles.centerCount}>{centers.length} מרכזים</span>
                </div>
                <Button onClick={handleAddCenter} icon={Plus}>
                    הוסף מרכז
                </Button>
            </header>

            {centers.length === 0 ? (
                <div className={styles.emptyState}>
                    <Building2 className={styles.emptyIcon} />
                    <p className={styles.emptyText}>לא נמצאו מרכזים</p>
                    <Button onClick={handleAddCenter} variant="ghost">
                        צור את המרכז הראשון
                    </Button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {centers.map(center => {
                        const stats = centerStats[center.id] || { groupsCount: 0, coachesCount: 0 };
                        return (
                            <div
                                key={center.id}
                                className={styles.card}
                                onClick={() => handleCardClick(center)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(center); }}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.iconWrapper}>
                                        <Building2 size={24} />
                                    </div>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={(e) => handleEditCenter(e, center)}
                                            className={styles.actionButton}
                                            title="ערוך"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteClick(e, center)}
                                            className={`${styles.actionButton} ${styles.delete}`}
                                            title="מחק"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className={styles.cardTitle}>{center.name}</h3>

                                <div className={styles.cardDetails}>
                                    {center.address && (
                                        <div className={styles.detailRow}>
                                            <MapPin size={16} className={styles.detailIcon} />
                                            <span>{center.address}</span>
                                        </div>
                                    )}
                                    {center.phone && (
                                        <div className={styles.detailRow}>
                                            <Phone size={16} className={styles.detailIcon} />
                                            <span>{center.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.statsRow}>
                                    <div className={styles.stat}>
                                        <Users size={14} className={styles.statIcon} />
                                        <span className={styles.statValue}>{stats.coachesCount}</span>
                                        <span className={styles.statLabel}>מאמנים</span>
                                    </div>
                                    <div className={styles.statDivider} />
                                    <div className={styles.stat}>
                                        <Layers size={14} className={styles.statIcon} />
                                        <span className={styles.statValue}>{stats.groupsCount}</span>
                                        <span className={styles.statLabel}>קבוצות</span>
                                    </div>
                                </div>

                                <div className={styles.viewDashboard}>
                                    <Eye size={14} />
                                    <span>צפה בדשבורד המרכז</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteTarget}
                onClose={handleDeleteCancel}
                title="מחיקת מרכז"
                size="small"
                closeOnOverlayClick={false}
            >
                <Modal.Body>
                    <div className={styles.deleteModalContent}>
                        <div className={styles.deleteWarningIcon}>
                            <AlertTriangle size={32} />
                        </div>
                        <p className={styles.deleteWarningTitle}>
                            האם אתה בטוח שברצונך למחוק את <strong>{deleteTarget?.name}</strong>?
                        </p>
                        <p className={styles.deleteWarningText}>
                            פעולה זו תמחק את המרכז לצמיתות. פעולה זו אינה ניתנת לביטול.
                        </p>
                        <p className={styles.deleteWarningText}>
                            כל הקבוצות, המאמנים והנתונים המשויכים למרכז זה עלולים להיפגע.
                        </p>
                        <label className={styles.deleteInputLabel}>
                            הקלד <strong>{deleteTarget?.name}</strong> לאישור:
                        </label>
                        <input
                            type="text"
                            className={styles.deleteInput}
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={deleteTarget?.name}
                            autoFocus
                            dir="rtl"
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="danger"
                        onClick={handleDeleteConfirm}
                        disabled={!isDeleteNameMatch || isDeleting}
                    >
                        {isDeleting ? 'מוחק...' : 'מחק לצמיתות'}
                    </Button>
                    <Button variant="ghost" onClick={handleDeleteCancel}>
                        ביטול
                    </Button>
                </Modal.Footer>
            </Modal>

            <CenterFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                center={selectedCenter}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}

export default CentersPage;
