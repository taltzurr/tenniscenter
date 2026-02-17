import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Settings, Tag, Video } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import useAuthStore from '../../../stores/authStore';
import useUIStore from '../../../stores/uiStore';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, AGE_GROUPS } from '../../../services/exercises';
import { createRequest } from '../../../services/exerciseRequests';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import VideoUploader from '../../../components/ui/VideoUploader';
import Comments from '../../../components/ui/Comments';
import { ENTITY_TYPES } from '../../../services/comments';
import styles from './ExerciseForm.module.css';

function ExerciseForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { userData } = useAuthStore();
    const { addExercise, editExercise, fetchExercise, currentExercise, isLoading, clearCurrentExercise } = useExercisesStore();
    const { addToast } = useUIStore();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'forehand',
        difficulty: 2,
        duration: 15,
        ageGroups: [],
        equipment: '',
        tags: '',
        videoUrl: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            fetchExercise(id);
        }
        return () => clearCurrentExercise();
    }, [id, isEditMode, fetchExercise, clearCurrentExercise]);

    useEffect(() => {
        if (currentExercise && isEditMode) {
            setFormData({
                title: currentExercise.title || '',
                description: currentExercise.description || '',
                category: currentExercise.category || 'forehand',
                difficulty: currentExercise.difficulty || 2,
                duration: currentExercise.duration || 15,
                ageGroups: currentExercise.ageGroups || [],
                equipment: currentExercise.equipment?.join(', ') || '',
                tags: currentExercise.tags?.join(', ') || '',
                videoUrl: currentExercise.videoUrl || ''
            });
        }
    }, [currentExercise, isEditMode]);

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const toggleAgeGroup = (ageGroup) => {
        setFormData(prev => ({
            ...prev,
            ageGroups: prev.ageGroups.includes(ageGroup)
                ? prev.ageGroups.filter(a => a !== ageGroup)
                : [...prev.ageGroups, ageGroup]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            addToast({ type: 'error', message: 'נא להזין שם לתרגיל' });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                difficulty: parseInt(formData.difficulty),
                duration: parseInt(formData.duration),
                equipment: formData.equipment.split(',').map(s => s.trim()).filter(Boolean),
                tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
                createdBy: userData?.id,
                createdByName: userData?.displayName || userData?.name || userData?.email || 'Unknown'
            };

            // Check if user is supervisor or admin - they can create directly
            const canCreateDirectly = userData?.role === 'supervisor' || userData?.role === 'admin';

            if (isEditMode) {
                // Edit mode - update directly (only allowed users should reach this)
                await editExercise(id, payload);
                addToast({ type: 'success', message: 'התרגיל עודכן בהצלחה' });
                navigate('/exercises');
            } else if (canCreateDirectly) {
                // Supervisors/Admins can create directly
                await addExercise(payload);
                addToast({ type: 'success', message: 'התרגיל נוצר בהצלחה ונוסף למאגר' });
                navigate('/exercises');
            } else {
                // Coaches create a request for approval
                await createRequest({
                    ...payload,
                    requestedBy: userData?.id,
                    requestedByName: userData?.displayName || userData?.name || userData?.email || 'Unknown'
                });
                addToast({
                    type: 'success',
                    message: 'התרגיל נשלח לאישור המנהל המקצועי'
                });
                navigate('/exercise-requests');
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'שגיאה בשמירת התרגיל' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && isEditMode) {
        return <Spinner.FullPage />;
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
                </button>
                <h1 className={styles.title}>
                    {isEditMode ? 'עריכת תרגיל' : 'תרגיל חדש'}
                </h1>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <BookOpen size={18} />
                        פרטים בסיסיים
                    </h2>
                    <div className={styles.fieldGroup}>
                        <Input
                            label="שם התרגיל *"
                            placeholder="למשל: סרב קפיצה"
                            value={formData.title}
                            onChange={handleChange('title')}
                            required
                        />

                        <div>
                            <label className={styles.label}>תיאור</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="תאר את התרגיל בפירוט..."
                                value={formData.description}
                                onChange={handleChange('description')}
                            />
                        </div>
                    </div>
                </div>

                {/* Video Upload */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Video size={18} />
                        וידאו הדגמה
                    </h2>
                    <div className={styles.fieldGroup}>
                        <VideoUploader
                            value={formData.videoUrl}
                            onChange={(url) => setFormData(prev => ({ ...prev, videoUrl: url }))}
                            exerciseId={id || 'new'}
                        />
                    </div>
                </div>

                {/* Settings */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Settings size={18} />
                        הגדרות
                    </h2>
                    <div className={styles.fieldGroup}>
                        <div className={styles.row}>
                            <div>
                                <label className={styles.label}>קטגוריה</label>
                                <select
                                    className={styles.select}
                                    value={formData.category}
                                    onChange={handleChange('category')}
                                >
                                    {EXERCISE_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={styles.label}>רמת קושי</label>
                                <select
                                    className={styles.select}
                                    value={formData.difficulty}
                                    onChange={handleChange('difficulty')}
                                >
                                    {DIFFICULTY_LEVELS.map(level => (
                                        <option key={level.value} value={level.value}>
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={styles.label}>משך (דקות)</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={formData.duration}
                                    onChange={handleChange('duration')}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={styles.label}>קבוצות גיל מתאימות</label>
                            <div className={styles.checkboxGroup}>
                                {AGE_GROUPS.map(age => (
                                    <label
                                        key={age.value}
                                        className={`${styles.checkbox} ${formData.ageGroups.includes(age.value) ? styles.selected : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.ageGroups.includes(age.value)}
                                            onChange={() => toggleAgeGroup(age.value)}
                                            style={{ display: 'none' }}
                                        />
                                        {age.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tags */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Tag size={18} />
                        תגיות וציוד
                    </h2>
                    <div className={styles.fieldGroup}>
                        <Input
                            label="ציוד נדרש"
                            placeholder="כדורים, קונוסים, רשת (מופרד בפסיקים)"
                            value={formData.equipment}
                            onChange={handleChange('equipment')}
                        />

                        <Input
                            label="תגיות לחיפוש"
                            placeholder="טכניקה, התחלתי, אחיזה (מופרד בפסיקים)"
                            value={formData.tags}
                            onChange={handleChange('tags')}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/exercises')}
                    >
                        ביטול
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="small" color="white" /> : (
                            isEditMode
                                ? 'שמור שינויים'
                                : (userData?.role === 'supervisor' || userData?.role === 'admin'
                                    ? 'צור תרגיל'
                                    : 'שלח לאישור')
                        )}
                    </Button>
                </div>
            </form>

            {/* Comments Section - only in edit mode */}
            {isEditMode && id && (
                <div className={styles.card} style={{ marginTop: '24px' }}>
                    <Comments
                        entityType={ENTITY_TYPES.EXERCISE}
                        entityId={id}
                        title="הערות לתרגיל"
                    />
                </div>
            )}
        </div>
    );
}

export default ExerciseForm;
