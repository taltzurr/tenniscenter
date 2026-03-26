import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Settings, Tag, Puzzle } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import useAuthStore from '../../../stores/authStore';
import useUIStore from '../../../stores/uiStore';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, EXERCISE_TOPICS, GAME_COMPONENTS } from '../../../services/exercises';
import { createRequest } from '../../../services/exerciseRequests';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
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
        category: 'two_behind',
        difficulty: 'all_levels',
        topics: [],
        gameComponents: [],
        equipment: '',
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
                category: currentExercise.category || 'two_behind',
                difficulty: currentExercise.difficulty || 'all_levels',
                topics: currentExercise.topics || [],
                gameComponents: currentExercise.gameComponents || [],
                equipment: currentExercise.equipment?.join(', ') || '',
            });
        }
    }, [currentExercise, isEditMode]);

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const toggleItem = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(v => v !== value)
                : [...prev[field], value]
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
                equipment: formData.equipment.split(',').map(s => s.trim()).filter(Boolean),
                createdBy: userData?.id,
                createdByName: userData?.displayName || userData?.name || userData?.email || 'Unknown'
            };

            // Check if user is supervisor or admin - they can create directly
            const canCreateDirectly = userData?.role === 'supervisor' || userData?.role === 'admin';

            if (isEditMode) {
                await editExercise(id, payload);
                addToast({ type: 'success', message: 'התרגיל עודכן בהצלחה' });
                navigate('/exercises');
            } else if (canCreateDirectly) {
                await addExercise(payload);
                addToast({ type: 'success', message: 'התרגיל נוצר בהצלחה ונוסף למאגר' });
                navigate('/exercises');
            } else {
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
                            <label className={styles.label}>הסבר התרגיל</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="הסבר את התרגיל בפירוט..."
                                value={formData.description}
                                onChange={handleChange('description')}
                            />
                        </div>
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
                                <label className={styles.label}>מצב משחק</label>
                                <select
                                    className={styles.select}
                                    value={formData.category}
                                    onChange={handleChange('category')}
                                >
                                    {EXERCISE_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.emoji} {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={styles.label}>רמה</label>
                                <select
                                    className={styles.select}
                                    value={formData.difficulty}
                                    onChange={handleChange('difficulty')}
                                >
                                    {DIFFICULTY_LEVELS.map(level => (
                                        <option key={level.value} value={level.value}>
                                            {level.emoji} {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exercise Topics */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Tag size={18} />
                        נושא התרגיל
                    </h2>
                    <div className={styles.fieldGroup}>
                        <div className={styles.checkboxGroup}>
                            {EXERCISE_TOPICS.map(topic => (
                                <label
                                    key={topic.value}
                                    className={`${styles.checkbox} ${formData.topics.includes(topic.value) ? styles.selected : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.topics.includes(topic.value)}
                                        onChange={() => toggleItem('topics', topic.value)}
                                        style={{ display: 'none' }}
                                    />
                                    {topic.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Game Components */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Puzzle size={18} />
                        מרכיב משחק
                    </h2>
                    <div className={styles.fieldGroup}>
                        <div className={styles.checkboxGroup}>
                            {GAME_COMPONENTS.map(comp => (
                                <label
                                    key={comp.value}
                                    className={`${styles.checkbox} ${formData.gameComponents.includes(comp.value) ? styles.selectedBlue : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.gameComponents.includes(comp.value)}
                                        onChange={() => toggleItem('gameComponents', comp.value)}
                                        style={{ display: 'none' }}
                                    />
                                    {comp.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Equipment */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Settings size={18} />
                        ציוד נדרש
                    </h2>
                    <div className={styles.fieldGroup}>
                        <Input
                            placeholder="כדורים, קונוסים, רשת (מופרד בפסיקים)"
                            value={formData.equipment}
                            onChange={handleChange('equipment')}
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
