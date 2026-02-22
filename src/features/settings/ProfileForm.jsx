import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import Button from '../../components/ui/Button';
import useAuthStore from '../../stores/authStore';
import useCentersStore from '../../stores/centersStore';
import styles from './ProfileForm.module.css';
import { ROLES } from '../../config/constants';

function ProfileForm({ onClose }) {
    const { userData, updateProfile } = useAuthStore();
    const { centers, fetchCenters } = useCentersStore();

    // Fetch centers on mount
    useEffect(() => {
        if (centers.length === 0) fetchCenters();
    }, [centers.length, fetchCenters]);

    const [formData, setFormData] = useState({
        displayName: userData?.displayName || '',
        email: userData?.email || '', // Read-only usually
        phone: userData?.phone || '',
        centerId: userData?.centerIds?.[0] || userData?.centerId || '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updateData = {
                displayName: formData.displayName,
                phone: formData.phone,
            };
            if (userData?.role !== ROLES.CENTER_MANAGER) {
                updateData.centerIds = [formData.centerId];
                updateData.centerName = centers.find(c => c.id === formData.centerId)?.name || '';
            }
            await updateProfile(updateData);
            onClose();
        } catch (error) {
            console.error('Failed to update profile', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>עריכת פרופיל</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>שם מלא</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.displayName}
                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>טלפון</label>
                        <input
                            type="tel"
                            className={styles.input}
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>מרכז טניס</label>
                        {userData?.role === ROLES.CENTER_MANAGER ? (
                            <input
                                type="text"
                                className={`${styles.input} ${styles.disabled}`}
                                value={centers.find(c => c.id === (userData?.managedCenterId || userData?.centerIds?.[0]))?.name || 'לא מוגדר'}
                                readOnly
                                aria-label="מרכז טניס (לקריאה בלבד)"
                            />
                        ) : (
                            <select
                                className={styles.input}
                                value={formData.centerId}
                                onChange={e => setFormData({ ...formData, centerId: e.target.value })}
                            >
                                <option value="">בחר מרכז...</option>
                                {centers.map(center => (
                                    <option key={center.id} value={center.id}>
                                        {center.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>אימייל (לקריאה בלבד)</label>
                        <input
                            type="email"
                            className={`${styles.input} ${styles.disabled}`}
                            value={formData.email}
                            disabled
                        />
                    </div>

                    <div className={styles.actions}>
                        <Button type="button" variant="ghost" onClick={onClose}>ביטול</Button>
                        <Button type="submit" variant="primary" disabled={isSaving}>
                            <Save size={18} />
                            {isSaving ? 'שומר...' : 'שמור שינויים'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProfileForm;
