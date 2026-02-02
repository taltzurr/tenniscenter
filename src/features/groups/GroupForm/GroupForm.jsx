import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useUIStore from '../../../stores/uiStore';
import { DEFAULT_GROUP_TYPES } from '../../../config/constants';
import styles from './GroupForm.module.css';

function GroupForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { userData } = useAuthStore();
    const { selectedGroup, fetchGroup, addGroup, editGroup, isLoading } = useGroupsStore();
    const { addToast } = useUIStore();

    const [formData, setFormData] = useState({
        name: '',
        groupTypeId: '',
        color: '#2563eb', // Default blue
        birthYearFrom: new Date().getFullYear() - 14,
        birthYearTo: new Date().getFullYear() - 12,
        playerCount: 0,
        notes: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load group data in edit mode
    useEffect(() => {
        if (isEditMode && id) {
            fetchGroup(id);
        }
    }, [isEditMode, id, fetchGroup]);

    // Populate form with existing data
    useEffect(() => {
        if (isEditMode && selectedGroup) {
            setFormData({
                name: selectedGroup.name || '',
                groupTypeId: selectedGroup.groupTypeId || '',
                color: selectedGroup.color || '#2563eb',
                birthYearFrom: selectedGroup.birthYearFrom || new Date().getFullYear() - 14,
                birthYearTo: selectedGroup.birthYearTo || new Date().getFullYear() - 12,
                playerCount: selectedGroup.playerCount || 0,
                notes: selectedGroup.notes || '',
            });
        }
    }, [isEditMode, selectedGroup]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'birthYearFrom' || name === 'birthYearTo' || name === 'playerCount'
                ? parseInt(value) || 0
                : value
        }));
        // Clear error when field is edited
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'שם הקבוצה הוא שדה חובה';
        }

        if (!formData.groupTypeId) {
            newErrors.groupTypeId = 'יש לבחור סוג קבוצה';
        }

        if (formData.birthYearFrom > formData.birthYearTo) {
            newErrors.birthYearFrom = 'שנתון התחלה חייב להיות קטן או שווה לשנתון סיום';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        const groupType = DEFAULT_GROUP_TYPES.find(t => t.id === formData.groupTypeId);
        const groupData = {
            ...formData,
            groupTypeName: groupType?.name || formData.groupTypeId,
            coachId: userData.id,
            centerId: userData.centerIds?.[0] || userData.managedCenterId || 'center-1',
        };

        let result;
        if (isEditMode) {
            result = await editGroup(id, groupData);
        } else {
            result = await addGroup(groupData);
        }

        setIsSubmitting(false);

        if (result.success) {
            addToast({
                type: 'success',
                message: isEditMode ? 'הקבוצה עודכנה בהצלחה' : 'הקבוצה נוצרה בהצלחה'
            });
            navigate('/groups');
        } else {
            addToast({ type: 'error', message: result.error || 'שגיאה בשמירת הקבוצה' });
        }
    };

    // Generate year options
    const currentYear = new Date().getFullYear();
    const startYear = 1980;
    const yearOptions = Array.from(
        { length: currentYear - startYear + 1 },
        (_, i) => currentYear - i
    );

    if (isLoading && isEditMode && !selectedGroup) {
        return <Spinner.FullPage text="טוען פרטי קבוצה..." />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <Link to="/groups" className={styles.backButton}>
                    <ArrowRight size={18} />
                    חזרה לקבוצות
                </Link>
                <h1 className={styles.title}>
                    {isEditMode ? 'עריכת קבוצה' : 'קבוצה חדשה'}
                </h1>
            </div>

            <div className={styles.card}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    {/* Group Name */}
                    <Input
                        name="name"
                        label="שם הקבוצה"
                        placeholder="למשל: תחרותי בנים א'"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                        required
                    />

                    {/* Group Color */}
                    <div style={{ marginBottom: '16px' }}>
                        <label className={styles.label}>
                            צבע הקבוצה (עבור לוח שנה)
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                '#2563eb', '#dc2626', '#16a34a', '#d97706',
                                '#7c3aed', '#db2777', '#0891b2', '#4f46e5',
                                '#000000', '#6b7280'
                            ].map(color => (
                                <div
                                    key={color}
                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: color,
                                        cursor: 'pointer',
                                        border: formData.color === color ? '3px solid var(--primary-500)' : '1px solid #e5e7eb',
                                        boxShadow: formData.color === color ? '0 0 0 2px white' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Group Type */}
                    <div>
                        <label className={styles.label}>
                            סוג קבוצה
                            <span className={styles.required}>*</span>
                        </label>
                        <select
                            name="groupTypeId"
                            className={styles.select}
                            value={formData.groupTypeId}
                            onChange={handleChange}
                        >
                            <option value="">בחר סוג קבוצה...</option>
                            {DEFAULT_GROUP_TYPES.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        {errors.groupTypeId && (
                            <span className={styles.error}>{errors.groupTypeId}</span>
                        )}
                    </div>

                    {/* Birth Years */}
                    <div className={styles.row}>
                        <div>
                            <label className={styles.label}>שנתון מ-</label>
                            <select
                                name="birthYearFrom"
                                className={styles.select}
                                value={formData.birthYearFrom}
                                onChange={handleChange}
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            {errors.birthYearFrom && (
                                <span className={styles.error}>{errors.birthYearFrom}</span>
                            )}
                        </div>
                        <div>
                            <label className={styles.label}>שנתון עד</label>
                            <select
                                name="birthYearTo"
                                className={styles.select}
                                value={formData.birthYearTo}
                                onChange={handleChange}
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Player Count */}
                    <Input
                        type="number"
                        name="playerCount"
                        label="מספר שחקנים"
                        placeholder="0"
                        value={formData.playerCount}
                        onChange={handleChange}
                        min="0"
                    />

                    {/* Notes */}
                    <Input
                        name="notes"
                        label="הערות"
                        placeholder="הערות נוספות על הקבוצה..."
                        value={formData.notes}
                        onChange={handleChange}
                        multiline
                    />

                    {/* Actions */}
                    <div className={styles.footer}>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Spinner size="small" color="white" />
                            ) : isEditMode ? (
                                'שמור שינויים'
                            ) : (
                                'צור קבוצה'
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/groups')}
                        >
                            ביטול
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default GroupForm;
