import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Clock, AlignLeft } from 'lucide-react';
import styles from './TrainingBuilder.module.css';

export function SessionTimelineItem({ id, exercise, duration, notes, onRemove, onUpdate }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.timelineItem}>
            <div className={styles.dragHandle} {...attributes} {...listeners}>
                <GripVertical size={20} />
            </div>

            <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>{exercise.name}</h3>
                    <button className={styles.removeButton} onClick={() => onRemove(id)}>
                        <X size={16} />
                    </button>
                </div>

                <div className={styles.itemDetails}>
                    <div className={styles.inputGroup}>
                        <Clock size={14} className={styles.inputIcon} />
                        <input
                            type="text"
                            className={styles.compactInput}
                            placeholder="משך (דק')"
                            value={duration}
                            onChange={(e) => onUpdate(id, { ...exercise, duration: e.target.value })}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <AlignLeft size={14} className={styles.inputIcon} />
                        <input
                            type="text"
                            className={styles.compactInput}
                            placeholder="הערות לביצוע..."
                            value={notes}
                            onChange={(e) => onUpdate(id, { ...exercise, notes: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
