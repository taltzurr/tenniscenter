import { Calendar, Clock, MapPin, Building2, Tag, FileText, Pencil, Trash } from 'lucide-react';
import Modal from '../Modal/Modal';
import { EVENT_LABELS, EVENT_COLORS } from '../../../services/events';
import styles from './EventDetailsModal.module.css';

function formatDateRange(date, endDate) {
    const start = new Date(date);
    const startStr = start.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    if (!endDate) return startStr;

    const end = new Date(endDate);
    if (start.toDateString() === end.toDateString()) return startStr;

    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

    if (sameMonth) {
        const endDay = end.getDate();
        return `${start.getDate()}-${endDay} ${start.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`;
    }

    const endStr = end.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
}

function resolveCenterNames(centerIds, centers) {
    if (!centerIds || centerIds.length === 0) return 'כל המרכזים';
    if (!centers || centers.length === 0) return 'כל המרכזים';

    return centerIds
        .map((id) => {
            const center = centers.find((c) => c.id === id);
            return center ? center.name : id;
        })
        .join(', ');
}

function EventDetailsModal({
    isOpen,
    event,
    onClose,
    canEdit = false,
    onEdit,
    onDelete,
    centers = [],
}) {
    if (!event) return null;

    const typeLabel = EVENT_LABELS[event.type] || event.type;
    const typeColor = EVENT_COLORS[event.type] || EVENT_COLORS.other;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={event.title} size="medium">
            <Modal.Body>
                <div className={styles.details}>
                    <div className={styles.row}>
                        <Tag size={18} className={styles.icon} />
                        <span
                            className={styles.badge}
                            style={{ backgroundColor: typeColor }}
                        >
                            {typeLabel}
                        </span>
                    </div>

                    <div className={styles.row}>
                        <Calendar size={18} className={styles.icon} />
                        <span className={styles.value}>
                            {formatDateRange(event.date, event.endDate)}
                        </span>
                    </div>

                    {event.time && (
                        <div className={styles.row}>
                            <Clock size={18} className={styles.icon} />
                            <span className={styles.value}>{event.time}</span>
                        </div>
                    )}

                    {event.location && (
                        <div className={styles.row}>
                            <MapPin size={18} className={styles.icon} />
                            <span className={styles.value}>{event.location}</span>
                        </div>
                    )}

                    <div className={styles.row}>
                        <Building2 size={18} className={styles.icon} />
                        <span className={styles.value}>
                            {resolveCenterNames(event.centerIds, centers)}
                        </span>
                    </div>

                    {event.description && (
                        <div className={styles.descriptionRow}>
                            <FileText size={18} className={styles.icon} />
                            <p className={styles.description}>{event.description}</p>
                        </div>
                    )}
                </div>
            </Modal.Body>

            {canEdit && (
                <Modal.Footer>
                    <div className={styles.actions}>
                        {onEdit && (
                            <button
                                className={styles.editButton}
                                onClick={onEdit}
                                type="button"
                            >
                                <Pencil size={16} />
                                <span>עריכה</span>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                className={styles.deleteButton}
                                onClick={onDelete}
                                type="button"
                            >
                                <Trash size={16} />
                                <span>מחיקה</span>
                            </button>
                        )}
                    </div>
                </Modal.Footer>
            )}
        </Modal>
    );
}

export default EventDetailsModal;
