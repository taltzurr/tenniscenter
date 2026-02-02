import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import useCentersStore from '../../stores/centersStore';
import useUIStore from '../../stores/uiStore';
import CenterFormModal from './CenterFormModal';
import styles from './CentersPage.module.css';

function CentersPage() {
    const { centers, isLoading, fetchCenters, addCenter, updateCenter, deleteCenter } = useCentersStore();
    const { addToast } = useUIStore();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCenters();
    }, [fetchCenters]);

    const handleAddCenter = () => {
        setSelectedCenter(null);
        setIsFormOpen(true);
    };

    const handleEditCenter = (center) => {
        setSelectedCenter(center);
        setIsFormOpen(true);
    };

    const handleDeleteCenter = async (center) => {
        if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${center.name}?`)) {
            const result = await deleteCenter(center.id);
            if (result.success) {
                addToast({ type: 'success', message: 'המרכז נמחק בהצלחה' });
            } else {
                addToast({ type: 'error', message: result.error });
            }
        }
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

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>ניהול מרכזים</h1>
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
                    {centers.map(center => (
                        <div key={center.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.iconWrapper}>
                                    <Building2 size={24} />
                                </div>
                                <div className={styles.actions}>
                                    <button
                                        onClick={() => handleEditCenter(center)}
                                        className={styles.actionButton}
                                        title="ערוך"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCenter(center)}
                                        className={`${styles.actionButton} ${styles.delete}`}
                                        title="מחק"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className={styles.cardTitle}>{center.name}</h3>

                            <div className={styles.cardDetails}>
                                <div className={styles.detailRow}>
                                    <MapPin size={16} className={styles.detailIcon} />
                                    <span>{center.address}</span>
                                </div>
                                {center.phone && (
                                    <div className={styles.detailRow}>
                                        <Phone size={16} className={styles.detailIcon} />
                                        <span>{center.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
