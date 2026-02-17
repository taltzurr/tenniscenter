import React, { memo } from 'react';
import { CheckCircle, Circle, Clock, MapPin, Users } from 'lucide-react';
import { normalizeDate, formatHebrewTime } from '../../../utils/dateUtils';
import styles from './TrainingCard.module.css';

/**
 * Unified TrainingCard component - single source of truth for training display.
 *
 * @param {Object} training - Training data object
 * @param {Object} group - Group data object (optional)
 * @param {'full'|'compact'|'minimal'} variant - Display variant
 * @param {boolean} clickable - Whether the card is clickable
 * @param {boolean} toggleable - Whether status can be toggled
 * @param {boolean} showCoach - Whether to show coach name
 * @param {Function} onStatusToggle - (e, trainingId, currentStatus) => void
 * @param {Function} onClick - (training) => void
 */
const TrainingCard = memo(function TrainingCard({
    training,
    group,
    variant = 'compact',
    clickable = false,
    toggleable = false,
    showCoach = false,
    onStatusToggle,
    onClick,
}) {
    if (!training) return null;

    const tDate = normalizeDate(training.date);
    const time = training.time || formatHebrewTime(tDate);
    const duration = training.durationMinutes ? `${training.durationMinutes} דק'` : (training.duration || '60 דק\'');
    const groupName = group?.name || training.groupName || training.group || 'קבוצה';
    const location = training.location || 'מגרש ראשי';
    const status = training.status || 'planned';
    const isCompleted = status === 'completed';
    const topic = training.topic || groupName;

    const handleClick = () => {
        if (clickable && onClick) {
            onClick(training);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && clickable && onClick) {
            onClick(training);
        }
    };

    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (toggleable && onStatusToggle) {
            onStatusToggle(e, training.id, status);
        }
    };

    const cardClassName = [
        styles.card,
        styles[variant],
        clickable ? styles.clickable : '',
        isCompleted ? styles.completed : '',
    ].filter(Boolean).join(' ');

    if (variant === 'minimal') {
        return (
            <div
                className={cardClassName}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
            >
                <div className={styles.minimalContent}>
                    <span className={styles.minimalTime}>{time}</span>
                    <span className={styles.minimalTopic}>{topic}</span>
                    <span className={styles.minimalGroup}>{groupName}</span>
                </div>
                {toggleable && (
                    <button
                        onClick={handleToggle}
                        className={`${styles.toggleBtn} ${isCompleted ? styles.toggleCompleted : ''}`}
                        aria-label={isCompleted ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                    >
                        {isCompleted ? <CheckCircle size={18} /> : <Circle size={18} />}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            className={cardClassName}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
        >
            {/* Time Section */}
            <div className={styles.timeSection}>
                <span className={styles.timeValue}>{time}</span>
                {variant === 'full' && <span className={styles.timeLabel}>היום</span>}
            </div>

            {/* Content Section */}
            <div className={styles.content}>
                <div className={styles.topicName}>{topic}</div>
                <div className={styles.meta}>
                    <span className={styles.metaItem}>
                        <Users size={14} />
                        {groupName}
                    </span>
                    <span className={styles.metaDot}>•</span>
                    <span className={styles.metaItem}>
                        <MapPin size={14} />
                        {location}
                    </span>
                    {variant === 'full' && (
                        <>
                            <span className={styles.metaDot}>•</span>
                            <span className={styles.metaItem}>
                                <Clock size={14} />
                                {duration}
                            </span>
                        </>
                    )}
                </div>
                {showCoach && training.coachName && (
                    <div className={styles.coachName}>מאמן: {training.coachName}</div>
                )}
            </div>

            {/* Status Toggle */}
            {toggleable && (
                <button
                    onClick={handleToggle}
                    className={`${styles.toggleBtn} ${isCompleted ? styles.toggleCompleted : ''}`}
                    aria-label={isCompleted ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                >
                    {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                </button>
            )}

            {/* Status Badge (non-toggleable) */}
            {!toggleable && (
                <div className={`${styles.statusBadge} ${isCompleted ? styles.statusCompleted : styles.statusPlanned}`}>
                    {isCompleted ? 'בוצע' : 'מתוכנן'}
                </div>
            )}
        </div>
    );
});

export default TrainingCard;
