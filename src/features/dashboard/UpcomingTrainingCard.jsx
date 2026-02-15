import { CheckCircle, MapPin, Clock, CalendarDays, Users } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './UpcomingTrainingCard.module.css';

function UpcomingTrainingCard({ training, nextTraining, onConfirm, onClick }) {
    if (!training) {
        // Empty state - no training today
        const nextInfo = nextTraining
            ? `האימון הבא: ${nextTraining.day} ב-${nextTraining.time}`
            : 'אין אימונים מתוכננים השבוע';

        return null;
    }

    const isCompleted = training.status === 'completed';

    // Check if training is within 1 hour
    const now = new Date();
    const trainingDate = training.rawDate;
    const isWithinHour = trainingDate && (trainingDate - now) > 0 && (trainingDate - now) < 3600000;

    return (
        <div
            className={`${styles.card} ${isWithinHour ? styles.pulse : ''}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
            role="button"
            tabIndex={0}
        >
            <div className={styles.content}>
                <div className={styles.timeSection}>
                    <span className={styles.time}>{training.time}</span>
                    <span className={styles.label}>היום</span>
                </div>

                <div className={styles.details}>
                    <div className={styles.groupName}>{training.topic || training.group}</div>
                    <div className={styles.meta}>
                        <span className={styles.metaItem}>
                            <Users size={14} />
                            {training.group}
                        </span>
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
                    onClick={(e) => {
                        e.stopPropagation();
                        onConfirm(training.id, training.status);
                    }}
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
