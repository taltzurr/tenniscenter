import { useState, useEffect } from 'react';
import { X, Edit3, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import useTrainingsStore from '../../../stores/trainingsStore';
import useUIStore from '../../../stores/uiStore';
import styles from './SeriesManagementModal.module.css';

const STATUS_LABELS = {
    draft: 'טיוטה',
    planned: 'מתוכנן',
    completed: 'הושלם',
    cancelled: 'בוטל',
};

const STATUS_COLORS = {
    draft: 'var(--gray-500)',
    planned: 'var(--primary-500)',
    completed: 'var(--success-500)',
    cancelled: 'var(--error-500)',
};

function SeriesManagementModal({ recurrenceGroupId, currentTrainingId, onClose, onSeriesDeleted }) {
    const { seriesTrainings, seriesLoading, fetchSeries, updateSeries, deleteSeries, clearSeries } =
        useTrainingsStore();
    const addToast = useUIStore((state) => state.addToast);

    const [action, setAction] = useState(null); // null | 'update' | 'delete'
    const [scope, setScope] = useState('future'); // 'future' | 'all'
    const [updateFields, setUpdateFields] = useState({
        startTime: '',
        endTime: '',
        topic: '',
        location: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        fetchSeries(recurrenceGroupId);
        return () => {
            clearSeries();
        };
    }, [recurrenceGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

    const now = new Date();
    const futureTrainings = seriesTrainings.filter((t) => {
        const d = t.date instanceof Date ? t.date : t.date?.toDate?.() ?? new Date(t.date);
        return d >= now;
    });
    const futureCount = futureTrainings.length;
    const total = seriesTrainings.length;
    const scopeCount = scope === 'future' ? futureCount : total;

    const formatTrainingDate = (training) => {
        try {
            const d =
                training.date instanceof Date
                    ? training.date
                    : training.date?.toDate?.() ?? new Date(training.date);
            return format(d, "EEEE, d בMMMM", { locale: he });
        } catch {
            return '';
        }
    };

    const handleUpdateSubmit = async () => {
        // Build only non-empty fields
        const updates = {};
        if (updateFields.startTime) updates.startTime = updateFields.startTime;
        if (updateFields.endTime) updates.endTime = updateFields.endTime;
        if (updateFields.topic) updates.topic = updateFields.topic;
        if (updateFields.location) updates.location = updateFields.location;

        if (Object.keys(updates).length === 0) {
            addToast({ type: 'warning', message: 'יש למלא לפחות שדה אחד לעדכון' });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await updateSeries(recurrenceGroupId, updates, scope);
            const count = result?.updated ?? scopeCount;
            addToast({ type: 'success', message: `${count} אימונים עודכנו בהצלחה` });
            setAction(null);
            setUpdateFields({ startTime: '', endTime: '', topic: '', location: '' });
        } catch {
            addToast({ type: 'error', message: 'שגיאה בעדכון הסדרה' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setIsProcessing(true);
        try {
            const result = await deleteSeries(recurrenceGroupId, scope);
            const count = result?.deleted ?? scopeCount;
            addToast({ type: 'success', message: `${count} אימונים נמחקו בהצלחה` });
            setShowConfirm(false);
            setAction(null);
            if (scope === 'all' && onSeriesDeleted) {
                onSeriesDeleted();
            } else {
                onClose();
            }
        } catch {
            addToast({ type: 'error', message: 'שגיאה במחיקת הסדרה' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Loading state
    if (seriesLoading) {
        return (
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.spinner}>
                        <Loader2 size={32} className={styles.spinnerIcon} />
                        <span>טוען נתוני סדרה...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Empty/Single state
    if (!seriesLoading && seriesTrainings.length <= 1) {
        return (
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.emptyState}>
                        <span>אימון זה הוא היחיד בסדרה</span>
                        <button className={styles.secondaryBtn} onClick={onClose}>
                            סגור
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <span className={styles.title}>ניהול סדרה</span>
                            <span className={styles.countBadge}>{total} אימונים</span>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose} aria-label="סגור">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Training list */}
                    <div className={styles.trainingList}>
                        {seriesTrainings.map((training) => {
                            const isCurrent = training.id === currentTrainingId;
                            return (
                                <div
                                    key={training.id}
                                    className={`${styles.trainingItem} ${isCurrent ? styles.currentItem : ''}`}
                                >
                                    <div className={styles.trainingInfo}>
                                        <span className={styles.trainingDate}>
                                            {formatTrainingDate(training)}
                                            {isCurrent && (
                                                <span className={styles.currentLabel}> (נוכחי)</span>
                                            )}
                                        </span>
                                        <span className={styles.trainingTime}>
                                            {training.startTime}
                                            {training.endTime ? ` – ${training.endTime}` : ''}
                                        </span>
                                    </div>
                                    <span
                                        className={styles.statusBadge}
                                        style={{
                                            backgroundColor: STATUS_COLORS[training.status] ?? 'var(--gray-500)',
                                            color: 'white',
                                        }}
                                    >
                                        {STATUS_LABELS[training.status] ?? training.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {futureCount > 0 && (
                        <p className={styles.futureNote}>{futureCount} אימונים עתידיים בסדרה</p>
                    )}

                    {/* Action panel */}
                    {action === 'update' && (
                        <div className={styles.actionPanel}>
                            <p className={styles.panelTitle}>עדכון אימונים</p>

                            {/* Scope selector */}
                            <div className={styles.scopeSelector}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="future"
                                        checked={scope === 'future'}
                                        onChange={() => setScope('future')}
                                    />
                                    רק עתידיים ({futureCount})
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="all"
                                        checked={scope === 'all'}
                                        onChange={() => setScope('all')}
                                    />
                                    כל הסדרה ({total})
                                </label>
                            </div>

                            {/* Update fields */}
                            <div className={styles.fieldGroup}>
                                <div>
                                    <p className={styles.fieldLabel}>שעת התחלה</p>
                                    <input
                                        type="time"
                                        className={styles.fieldInput}
                                        value={updateFields.startTime}
                                        onChange={(e) =>
                                            setUpdateFields((prev) => ({ ...prev, startTime: e.target.value }))
                                        }
                                    />
                                </div>
                                <div>
                                    <p className={styles.fieldLabel}>שעת סיום</p>
                                    <input
                                        type="time"
                                        className={styles.fieldInput}
                                        value={updateFields.endTime}
                                        onChange={(e) =>
                                            setUpdateFields((prev) => ({ ...prev, endTime: e.target.value }))
                                        }
                                    />
                                </div>
                                <div>
                                    <p className={styles.fieldLabel}>נושא</p>
                                    <input
                                        type="text"
                                        className={styles.fieldInput}
                                        value={updateFields.topic}
                                        placeholder="נושא האימון"
                                        onChange={(e) =>
                                            setUpdateFields((prev) => ({ ...prev, topic: e.target.value }))
                                        }
                                    />
                                </div>
                                <div>
                                    <p className={styles.fieldLabel}>מיקום</p>
                                    <input
                                        type="text"
                                        className={styles.fieldInput}
                                        value={updateFields.location}
                                        placeholder="מיקום האימון"
                                        onChange={(e) =>
                                            setUpdateFields((prev) => ({ ...prev, location: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className={styles.panelActions}>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={handleUpdateSubmit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 size={14} className={styles.spinnerIcon} /> : null}
                                    עדכן
                                </button>
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={() => setAction(null)}
                                    disabled={isProcessing}
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    )}

                    {action === 'delete' && (
                        <div className={styles.actionPanel}>
                            <p className={styles.panelTitle}>מחיקת אימונים</p>

                            {/* Scope selector */}
                            <div className={styles.scopeSelector}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="future"
                                        checked={scope === 'future'}
                                        onChange={() => setScope('future')}
                                    />
                                    רק עתידיים ({futureCount})
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="all"
                                        checked={scope === 'all'}
                                        onChange={() => setScope('all')}
                                    />
                                    כל הסדרה ({total})
                                </label>
                            </div>

                            <p className={styles.warningText}>
                                <AlertTriangle size={16} />
                                פעולה זו אינה ניתנת לביטול
                            </p>

                            <div className={styles.panelActions}>
                                <button
                                    className={styles.dangerBtn}
                                    onClick={() => setShowConfirm(true)}
                                    disabled={isProcessing}
                                >
                                    מחק
                                </button>
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={() => setAction(null)}
                                    disabled={isProcessing}
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main action buttons (shown when no action selected) */}
                    {!action && (
                        <div className={styles.actions}>
                            <button
                                className={`${styles.actionBtn} ${styles.primaryBtn}`}
                                onClick={() => setAction('update')}
                            >
                                <Edit3 size={16} />
                                עדכון אימונים
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                onClick={() => setAction('delete')}
                            >
                                <Trash2 size={16} />
                                מחיקת אימונים
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            {showConfirm && (
                <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <p className={styles.confirmTitle}>האם אתה בטוח?</p>
                        <p className={styles.confirmMessage}>
                            {scopeCount} אימונים יימחקו לצמיתות
                        </p>
                        <div className={styles.confirmActions}>
                            <button
                                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                onClick={handleDeleteConfirm}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 size={14} className={styles.spinnerIcon} /> : null}
                                מחק
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                                onClick={() => setShowConfirm(false)}
                                disabled={isProcessing}
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default SeriesManagementModal;
