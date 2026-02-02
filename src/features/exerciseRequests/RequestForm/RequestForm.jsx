import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquare, CheckCircle } from 'lucide-react';
import useAuthStore from '../../../stores/authStore';
import useExerciseRequestsStore from '../../../stores/exerciseRequestsStore';
import useUIStore from '../../../stores/uiStore';
import { EXERCISE_CATEGORIES, AGE_GROUPS } from '../../../services/exercises';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './RequestForm.module.css';

function RequestForm() {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { addRequest, isLoading } = useExerciseRequestsStore();
    const { addToast } = useUIStore();

    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        ageGroup: '',
        reason: ''
    });

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            addToast({ type: 'error', message: 'נא להזין שם לתרגיל המבוקש' });
            return;
        }

        if (!formData.description.trim()) {
            addToast({ type: 'error', message: 'נא לתאר את התרגיל' });
            return;
        }

        const result = await addRequest({
            ...formData,
            requestedBy: userData?.id,
            requestedByName: userData?.displayName || userData?.email,
            centerId: userData?.centerId
        });

        if (result.success) {
            setSubmitted(true);
        } else {
            addToast({ type: 'error', message: 'שגיאה בשליחת הבקשה' });
        }
    };

    if (submitted) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.successMessage}>
                        <CheckCircle className={styles.successIcon} />
                        <h2 className={styles.successTitle}>הבקשה נשלחה בהצלחה!</h2>
                        <p className={styles.successText}>
                            הבקשה שלך לתרגיל "{formData.title}" נשלחה לבדיקה.
                            <br />
                            נעדכן אותך כשהתרגיל יתווסף לספרייה.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Button variant="outline" onClick={() => navigate('/exercises')}>
                                חזרה לספרייה
                            </Button>
                            <Button onClick={() => navigate('/exercise-requests')}>
                                הבקשות שלי
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={() => navigate('/exercises')}
                    type="button"
                >
                    <ArrowRight size={20} />
                    חזרה לספרייה
                </button>
            </div>

            <h1 className={styles.title}>בקשה לתרגיל חדש</h1>

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <MessageSquare size={18} />
                        פרטי הבקשה
                    </h2>
                    <div className={styles.fieldGroup}>
                        <Input
                            label="שם התרגיל המבוקש *"
                            placeholder="למשל: תרגיל הגשה עם קפיצה"
                            value={formData.title}
                            onChange={handleChange('title')}
                            required
                        />

                        <div>
                            <label className={styles.label}>תיאור התרגיל *</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="תאר את התרגיל שאתה מחפש בפירוט..."
                                value={formData.description}
                                onChange={handleChange('description')}
                                required
                            />
                            <p className={styles.hint}>
                                תאר מה התרגיל כולל, מטרות, קבוצת גיל מתאימה, וכד'
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label className={styles.label}>קטגוריה (אופציונלי)</label>
                                <select
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--gray-300)',
                                        fontFamily: 'inherit'
                                    }}
                                    value={formData.category}
                                    onChange={handleChange('category')}
                                >
                                    <option value="">בחר קטגוריה</option>
                                    {EXERCISE_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={styles.label}>קבוצת גיל (אופציונלי)</label>
                                <select
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--gray-300)',
                                        fontFamily: 'inherit'
                                    }}
                                    value={formData.ageGroup}
                                    onChange={handleChange('ageGroup')}
                                >
                                    <option value="">בחר קבוצת גיל</option>
                                    {AGE_GROUPS.map(age => (
                                        <option key={age.value} value={age.value}>
                                            {age.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={styles.label}>למה אתה צריך תרגיל זה?</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="הסבר מדוע תרגיל זה יעזור לך..."
                                value={formData.reason}
                                onChange={handleChange('reason')}
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/exercises')}
                    >
                        ביטול
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner size="small" color="white" /> : 'שלח בקשה'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default RequestForm;
