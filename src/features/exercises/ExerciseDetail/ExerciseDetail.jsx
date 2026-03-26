import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Users, Tag, Layers, Edit3, Puzzle } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import useAuthStore from '../../../stores/authStore';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, EXERCISE_TOPICS, GAME_COMPONENTS } from '../../../services/exercises';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './ExerciseDetail.module.css';

function ExerciseDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { currentExercise, isLoading, fetchExercise, clearCurrentExercise } = useExercisesStore();
    const { userData } = useAuthStore();

    // Only supervisors can edit exercises
    const canEdit = userData?.role === 'supervisor' || userData?.role === 'admin';

    useEffect(() => {
        fetchExercise(id);
        return () => clearCurrentExercise();
    }, [id, fetchExercise, clearCurrentExercise]);

    if (isLoading || !currentExercise) {
        return <Spinner.FullPage />;
    }

    const category = EXERCISE_CATEGORIES.find(c => c.value === currentExercise.category);
    const diffLevel = DIFFICULTY_LEVELS.find(d => d.value === currentExercise.difficulty);

    const topicLabels = (currentExercise.topics || [])
        .map(t => EXERCISE_TOPICS.find(et => et.value === t)?.label)
        .filter(Boolean);

    const componentLabels = (currentExercise.gameComponents || [])
        .map(c => GAME_COMPONENTS.find(gc => gc.value === c)?.label)
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
                        <span className={styles.categoryBadge}>{category.emoji} {category.label}</span>
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
                    <div className={styles.statChip} style={{ color: diffLevel.color }}>
                        <span>{diffLevel.emoji} {diffLevel.label}</span>
                    </div>
                )}
            </div>

            {/* Description */}
            {currentExercise.description && (
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>
                        <Layers size={18} />
                        הסבר התרגיל
                    </h2>
                    <p className={styles.descriptionText}>{currentExercise.description}</p>
                </div>
            )}

            {/* Exercise Topics */}
            {topicLabels.length > 0 && (
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>
                        <Tag size={18} />
                        נושא התרגיל
                    </h2>
                    <div className={styles.tagsList}>
                        {topicLabels.map((label, i) => (
                            <span key={i} className={styles.tag}>{label}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Game Components */}
            {componentLabels.length > 0 && (
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>
                        <Puzzle size={18} />
                        מרכיב משחק
                    </h2>
                    <div className={styles.tagsList}>
                        {componentLabels.map((label, i) => (
                            <span key={i} className={styles.componentTag}>{label}</span>
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
        </div>
    );
}

export default ExerciseDetail;
