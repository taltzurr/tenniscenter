import { CheckCircle, MapPin, Clock, CalendarDays } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './UpcomingTrainingCard.module.css';

function UpcomingTrainingCard({ training, nextTraining, onConfirm }) {
    if (!training) {
        // Empty state - no training today
        const nextInfo = nextTraining
            ? `האימון הבא: ${nextTraining.day} ב-${nextTraining.time}`
            : 'אין אימונים מתוכננים השבוע';

        return (
            <div className={styles.card}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎉</div>
                    <div className={styles.emptyTitle}>יום חופשי!</div>
                    <div className={styles.emptySubtitle}>{nextInfo}</div>
                </div>
            </div>
        );
    }

    const isCompleted = training.status === 'completed';

    // Check if training is within 1 hour
    const now = new Date();
    const trainingDate = training.rawDate;
    const isWithinHour = trainingDate && (trainingDate - now) > 0 && (trainingDate - now) < 3600000;

    return (
        <div className={`${styles.card} ${isWithinHour ? styles.pulse : ''}`}>
            <div className={styles.content}>
                <div className={styles.timeSection}>
                    <span className={styles.time}>{training.time}</span>
                    <span className={styles.label}>היום</span>
                </div>

                <div className={styles.details}>
                    <div className={styles.groupName}>{training.group}</div>
                    <div className={styles.meta}>
                        <span className={styles.metaItem}>
                            <MapPin size={14} />
                            {training.location}
                        </span>
                        <span className={styles.metaDot}>•</span>
                        <span className={styles.metaItem}>
                            <Clock size={14} />
                            {training.duration}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                <Button
                    variant={isCompleted ? 'secondary' : 'primary'}
                    size="medium"
                    onClick={() => onConfirm(training.id, training.status)}
                    aria-label={isCompleted ? 'סמן אימון כלא בוצע' : 'אשר הגעה לאימון'}
                    style={{ width: '100%' }}
                >
                    <CheckCircle size={18} />
                    {isCompleted ? 'בוצע ✓' : 'סמן כבוצע'}
                </Button>
            </div>
        </div>
    );
}

export default UpcomingTrainingCard;
