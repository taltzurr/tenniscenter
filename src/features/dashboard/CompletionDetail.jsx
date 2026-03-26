import { useMemo } from 'react';
import { X, CheckCircle, Circle, Clock, MapPin, Users } from 'lucide-react';
import { normalizeDate, formatHebrewTime } from '../../utils/dateUtils';
import { HEBREW_DAYS } from '../../config/constants';
import CompletionRing from './CompletionRing';
import styles from './CompletionDetail.module.css';

/**
 * Bottom-sheet style modal showing weekly training completion breakdown.
 * Groups trainings by day, shows status per training.
 */
function CompletionDetail({ isOpen, onClose, trainings, groups }) {
    // Group trainings by day
    const dayGroups = useMemo(() => {
        if (!trainings?.length) return [];

        const grouped = {};
        trainings.forEach(t => {
            const d = normalizeDate(t.date);
            if (!d) return;
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!grouped[key]) {
                grouped[key] = {
                    date: d,
                    dayName: HEBREW_DAYS[d.getDay()],
                    dayNum: d.getDate(),
                    trainings: [],
                };
            }
            const group = groups?.find(g => g.id === t.groupId);
            grouped[key].trainings.push({
                ...t,
                time: formatHebrewTime(d),
                groupName: group?.name || t.groupName || 'קבוצה',
                location: t.location || 'מגרש ראשי',
            });
        });

        return Object.values(grouped).sort((a, b) => a.date - b.date);
    }, [trainings, groups]);

    const completed = trainings?.filter(t => t.status === 'completed').length || 0;
    const cancelled = trainings?.filter(t => t.status === 'cancelled').length || 0;
    const pending = trainings?.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length || 0;
    const total = trainings?.length || 0;

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.sheet} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>פירוט ביצוע שבועי</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="סגור">
                        <X size={20} />
                    </button>
                </div>

                {/* Summary */}
                <div className={styles.summary}>
                    <CompletionRing completed={completed} total={total} size={72} />
                    <div className={styles.summaryStats}>
                        <div className={styles.summaryRow}>
                            <span className={`${styles.dot} ${styles.dotCompleted}`} />
                            <span className={styles.summaryLabel}>בוצעו</span>
                            <span className={styles.summaryValue}>{completed}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={`${styles.dot} ${styles.dotPending}`} />
                            <span className={styles.summaryLabel}>ממתינים</span>
                            <span className={styles.summaryValue}>{pending}</span>
                        </div>
                        {cancelled > 0 && (
                            <div className={styles.summaryRow}>
                                <span className={`${styles.dot} ${styles.dotCancelled}`} />
                                <span className={styles.summaryLabel}>בוטלו</span>
                                <span className={styles.summaryValue}>{cancelled}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Day-by-day breakdown */}
                <div className={styles.daysList}>
                    {dayGroups.map((day, i) => {
                        const today = new Date();
                        const isToday = day.date.getDate() === today.getDate() &&
                            day.date.getMonth() === today.getMonth();
                        const isPast = day.date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                        return (
                            <div key={i} className={styles.dayGroup}>
                                <div className={`${styles.dayHeader} ${isToday ? styles.dayToday : ''}`}>
                                    <span className={styles.dayName}>
                                        יום {day.dayName}
                                        {isToday && <span className={styles.todayBadge}>היום</span>}
                                    </span>
                                    <span className={styles.dayDate}>{day.dayNum}</span>
                                </div>
                                <div className={styles.trainingsList}>
                                    {day.trainings.map(t => {
                                        const isCompleted = t.status === 'completed';
                                        const isCancelled = t.status === 'cancelled';

                                        return (
                                            <div
                                                key={t.id}
                                                className={`${styles.trainingRow} ${isCompleted ? styles.rowCompleted : ''} ${isCancelled ? styles.rowCancelled : ''}`}
                                            >
                                                <div className={styles.trainingIcon}>
                                                    {isCompleted ? (
                                                        <CheckCircle size={18} className={styles.iconCompleted} />
                                                    ) : isCancelled ? (
                                                        <X size={18} className={styles.iconCancelled} />
                                                    ) : (
                                                        <Circle size={18} className={styles.iconPending} />
                                                    )}
                                                </div>
                                                <div className={styles.trainingInfo}>
                                                    <span className={styles.trainingGroup}>{t.groupName}</span>
                                                    <span className={styles.trainingMeta}>
                                                        {t.time} · {t.location}
                                                    </span>
                                                </div>
                                                <span className={`${styles.statusLabel} ${isCompleted ? styles.labelCompleted : isCancelled ? styles.labelCancelled : styles.labelPending}`}>
                                                    {isCompleted ? 'בוצע' : isCancelled ? 'בוטל' : isPast ? 'לא בוצע' : 'מתוכנן'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CompletionDetail;
