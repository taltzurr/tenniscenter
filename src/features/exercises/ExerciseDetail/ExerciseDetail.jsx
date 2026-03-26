import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Clock, Zap, Users, Tag, Layers, Edit3, User } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import useAuthStore from '../../../stores/authStore';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, AGE_GROUPS } from '../../../services/exercises';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './ExerciseDetail.module.css';

function ExerciseDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { currentExercise, isLoading, fetchExercise, clearCurrentExercise } = useExercisesStore();
    const { userData } = useAuthStore();

    const canEdit = userData?.role === 'supervisor' || userData?.role === 'admin' ||
        (currentExercise?.createdBy === userData?.id);

    useEffect(() => {
        fetchExercise(id);
        return () => clearCurrentExercise();
    }, [id, fetchExercise, clearCurrentExercise]);

    if (isLoading || !currentExercise) {
        return <Spinner.FullPage />;
    }

    const category = EXERCISE_CATEGORIES.find(c => c.value === currentExercise.category);
    const diffLevel = DIFFICULTY_LEVELS.find(d => d.value === currentExercise.difficulty);
    const ageLabels = (currentExercise.ageGroups || [])
        .map(ag => AGE_GROUPS.find(a => a.value === ag)?.label)
        .filter(Boolean);

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
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>{currentExercise.title}</h1>
                    {category && (
                        <span className={styles.categoryBadge}>{category.label}</span>
                    )}
                </div>
                {canEdit && (
                    <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate(`/exercises/${id}/edit`)}
                    >
                        <Edit3 size={16} />
                        עריכה
                    </Button>
                )}
            </div>

            {/* Quick stats row */}
            <div className={styles.statsRow}>
                {diffLevel && (
                    <div className={styles.statChip}>
                        <Zap size={14} />
                        <span>{diffLevel.label}</span>
                        <div className={styles.difficulty}>
                            {[1, 2, 3, 4, 5].map(level => (
                                <span
                                    key={level}
                                    className={`${styles.diffDot} ${level <= currentExercise.difficulty ? styles.active : ''}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {currentExercise.duration && (
                    <div className={styles.statChip}>
                        <Clock size={14} />
                        <span>{currentExercise.duration} דקות</span>
                    </div>
                )}
                {ageLabels.length > 0 && (
                    <div className={styles.statChip}>
                        <Users size={14} />
                        <span>{ageLabels.join(', ')}</span>
                    </div>
                )}
            </div>

            {/* Description */}
            {currentExercise.description && (
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>
                        <Layers size={18} />
                        תיאור התרגיל
                    </h2>
                    <p className={styles.descriptionText}>{currentExercise.description}</p>
                </div>
            )}

            {/* Tags */}
            {currentExercise.tags?.length > 0 && (
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>
                        <Tag size={18} />
                        תגיות
                    </h2>
                    <div className={styles.tagsList}>
                        {currentExercise.tags.map((tag, i) => (
                            <span key={i} className={styles.tag}>{tag}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Equipment */}
            {currentExercise.equipment?.length > 0 && (
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>ציוד נדרש</h2>
                    <div className={styles.tagsList}>
                        {currentExercise.equipment.map((eq, i) => (
                            <span key={i} className={styles.equipTag}>{eq}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Author info */}
            {currentExercise.createdByName && (
                <div className={styles.authorRow}>
                    <User size={14} />
                    <span>נוצר ע״י {currentExercise.createdByName}</span>
                </div>
            )}
        </div>
    );
}

export default ExerciseDetail;
