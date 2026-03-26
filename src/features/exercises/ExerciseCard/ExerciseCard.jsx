import { Link } from 'react-router-dom';
import { Clock, Users, Zap } from 'lucide-react';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS } from '../../../services/exercises';
import styles from './ExerciseCard.module.css';

function ExerciseCard({ exercise }) {
    const category = EXERCISE_CATEGORIES.find(c => c.value === exercise.category);
    const diffLabel = DIFFICULTY_LEVELS.find(d => d.value === exercise.difficulty);

    // Truncate description for preview
    const descPreview = exercise.description
        ? exercise.description.length > 80
            ? exercise.description.slice(0, 80) + '...'
            : exercise.description
        : '';

    // Show up to 3 tags
    const visibleTags = (exercise.tags || []).slice(0, 3);
    const extraTagCount = (exercise.tags || []).length - 3;

    return (
        <Link to={`/exercises/${exercise.id}`} className={styles.card}>
            <div className={styles.cardHeader}>
                <span className={styles.category}>
                    {category ? `${category.emoji} ${category.label}` : exercise.category}
                </span>
                {exercise.difficulty && (
                    <div className={styles.difficulty}>
                        {[1, 2, 3, 4, 5].map(level => (
                            <span
                                key={level}
                                className={`${styles.difficultyDot} ${level <= exercise.difficulty ? styles.active : ''}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <h3 className={styles.title}>{exercise.title}</h3>

            {descPreview && (
                <p className={styles.description}>{descPreview}</p>
            )}

            {visibleTags.length > 0 && (
                <div className={styles.tags}>
                    {visibleTags.map((tag, i) => (
                        <span key={i} className={styles.tag}>{tag}</span>
                    ))}
                    {extraTagCount > 0 && (
                        <span className={styles.tagMore}>+{extraTagCount}</span>
                    )}
                </div>
            )}

            <div className={styles.meta}>
                {exercise.duration && (
                    <span className={styles.metaItem}>
                        <Clock size={13} />
                        {exercise.duration} דק'
                    </span>
                )}
                {diffLabel && (
                    <span className={styles.metaItem}>
                        <Zap size={13} />
                        {diffLabel.label}
                    </span>
                )}
                {exercise.ageGroups?.length > 0 && (
                    <span className={styles.metaItem}>
                        <Users size={13} />
                        {exercise.ageGroups[0]}
                    </span>
                )}
            </div>
        </Link>
    );
}

export default ExerciseCard;
