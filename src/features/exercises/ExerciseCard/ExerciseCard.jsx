import { Link } from 'react-router-dom';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, EXERCISE_TOPICS, GAME_COMPONENTS } from '../../../services/exercises';
import styles from './ExerciseCard.module.css';

function ExerciseCard({ exercise }) {
    const category = EXERCISE_CATEGORIES.find(c => c.value === exercise.category);
    const diffLevel = DIFFICULTY_LEVELS.find(d => d.value === exercise.difficulty);

    // Truncate description for preview
    const descPreview = exercise.description
        ? exercise.description.length > 80
            ? exercise.description.slice(0, 80) + '...'
            : exercise.description
        : '';

    // Show topic labels (up to 3)
    const topicLabels = (exercise.topics || [])
        .map(t => EXERCISE_TOPICS.find(et => et.value === t)?.label)
        .filter(Boolean)
        .slice(0, 3);
    const extraTopicCount = (exercise.topics || []).length - 3;

    // Show component labels
    const componentLabels = (exercise.gameComponents || [])
        .map(c => GAME_COMPONENTS.find(gc => gc.value === c)?.label)
        .filter(Boolean);

    return (
        <Link to={`/exercises/${exercise.id}`} className={styles.card}>
            <div className={styles.cardHeader}>
                <span className={styles.category}>
                    {category ? `${category.emoji} ${category.label}` : exercise.category}
                </span>
                {diffLevel && (
                    <span className={styles.levelBadge} style={{ color: diffLevel.color }}>
                        {diffLevel.emoji} {diffLevel.label}
                    </span>
                )}
            </div>

            <h3 className={styles.title}>{exercise.title}</h3>

            {descPreview && (
                <p className={styles.description}>{descPreview}</p>
            )}

            {(topicLabels.length > 0 || componentLabels.length > 0) && (
                <div className={styles.tags}>
                    {topicLabels.map((label, i) => (
                        <span key={`t-${i}`} className={styles.tag}>{label}</span>
                    ))}
                    {extraTopicCount > 0 && (
                        <span className={styles.tagMore}>+{extraTopicCount}</span>
                    )}
                    {componentLabels.map((label, i) => (
                        <span key={`c-${i}`} className={styles.componentTag}>{label}</span>
                    ))}
                </div>
            )}
        </Link>
    );
}

export default ExerciseCard;
