import { Link } from 'react-router-dom';
import { Play, Clock, Users } from 'lucide-react';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS } from '../../../services/exercises';
import styles from './ExerciseCard.module.css';

function ExerciseCard({ exercise }) {
    const category = EXERCISE_CATEGORIES.find(c => c.value === exercise.category);

    return (
        <Link to={`/exercises/${exercise.id}`} className={styles.card}>
            {exercise.thumbnail ? (
                <img
                    src={exercise.thumbnail}
                    alt={exercise.title}
                    className={styles.thumbnail}
                />
            ) : (
                <div className={styles.thumbnailPlaceholder}>
                    <Play size={40} />
                </div>
            )}

            <div className={styles.content}>
                <span className={styles.category}>
                    {category?.label || exercise.category}
                </span>

                <h3 className={styles.title}>{exercise.title}</h3>

                <div className={styles.meta}>
                    {exercise.duration && (
                        <span className={styles.metaItem}>
                            <Clock size={14} />
                            {exercise.duration} דק'
                        </span>
                    )}

                    {exercise.ageGroups?.length > 0 && (
                        <span className={styles.metaItem}>
                            <Users size={14} />
                            {exercise.ageGroups[0]}
                        </span>
                    )}

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
            </div>
        </Link>
    );
}

export default ExerciseCard;
