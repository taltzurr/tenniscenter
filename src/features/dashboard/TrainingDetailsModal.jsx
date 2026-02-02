import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Users, Activity, FileText, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import useTrainingsStore from '../../stores/trainingsStore';
import styles from './TrainingDetailsModal.module.css';

/**
 * Modal to view training details with an Edit action
 */
const TrainingDetailsModal = ({ training, isOpen, onClose }) => {
    const navigate = useNavigate();
    const { editTraining } = useTrainingsStore();

    if (!isOpen || !training) return null;

    const handleEdit = () => {
        navigate(`/trainings/${training.id}/edit`);
    };

    const handleStatusToggle = async () => {
        const newStatus = training.status === 'completed' ? 'planned' : 'completed';
        await editTraining(training.id, { status: newStatus });

        // Update local state if needed via parent, but store subscription usually handles it.
        // If training prop is a static snapshot, we might need to rely on the closes/re-opens or parent update.
        // For now, we assume the parent (Dashboard) will re-render and pass updated prop or we close modal.
        if (onClose) onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.header}>
                    <div className={styles.iconContainer}>
                        <Activity size={24} color="var(--primary-600)" />
                    </div>
                    <div>
                        <h2 className={styles.title}>{training.group}</h2>
                        <span className={styles.subtitle}>{training.location}</span>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Status Badge - Clickable */}
                    <div
                        className={`${styles.statusBadge} ${training.status === 'completed' ? styles.completed : ''}`}
                        onClick={handleStatusToggle}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                        title="לחץ לשינוי סטטוס"
                    >
                        {training.status === 'completed' ? (
                            <>
                                <CheckCircle size={14} />
                                <span>בוצע</span>
                            </>
                        ) : (
                            <>
                                <Clock size={14} />
                                <span>מתוכנן</span>
                            </>
                        )}
                    </div>

                    {/* Details Grid */}
                    <div className={styles.grid}>
                        <div className={styles.gridItem}>
                            <Calendar size={16} className={styles.gridIcon} />
                            <div>
                                <label className={styles.label}>יום ותאריך</label>
                                <div className={styles.value}>{training.day || '---'} | {training.time?.split(' ')[0] || '--:--'}</div>
                            </div>
                        </div>

                        <div className={styles.gridItem}>
                            <Clock size={16} className={styles.gridIcon} />
                            <div>
                                <label className={styles.label}>שעה ומשך</label>
                                <div className={styles.value}>{training.time} ({training.duration})</div>
                            </div>
                        </div>

                        <div className={styles.gridItem}>
                            <Users size={16} className={styles.gridIcon} />
                            <div>
                                <label className={styles.label}>קבוצה</label>
                                <div className={styles.value}>{training.group}</div>
                            </div>
                        </div>

                        <div className={styles.gridItem}>
                            <MapPin size={16} className={styles.gridIcon} />
                            <div>
                                <label className={styles.label}>מיקום</label>
                                <div className={styles.value}>{training.location}</div>
                            </div>
                        </div>
                    </div>

                    {/* Description if available */}
                    {training.description && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <FileText size={16} />
                                <span>תיאור האימון</span>
                            </div>
                            <p className={styles.description}>{training.description}</p>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="outline" onClick={handleStatusToggle}>
                            {training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                        </Button>
                        <Button variant="ghost" onClick={onClose}>
                            סגור
                        </Button>
                    </div>
                    <Button onClick={handleEdit}>
                        ערוך אימון
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TrainingDetailsModal;
