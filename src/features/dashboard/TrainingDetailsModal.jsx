import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Users, Activity, FileText, CheckCircle, Target, Briefcase, Zap, Tag } from 'lucide-react';
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

                    {/* Logistics Grid */}
                    <h3 className={styles.sectionHeader}>פרטי לוגיסטיקה</h3>
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

                    {/* Technical Specs */}
                    <h3 className={styles.sectionHeader} style={{ marginTop: '16px' }}>מפרט טכני ומקצועי</h3>
                    <div className={styles.grid}>
                        {/* Topic */}
                        <div className={styles.gridItem}>
                            <Activity size={16} className={styles.gridIcon} />
                            <div>
                                <label className={styles.label}>נושא האימון</label>
                                <div className={styles.value}>{training.topic || 'לא צוין'}</div>
                            </div>
                        </div>

                        {/* Period Type */}
                        {training.periodType && (
                            <div className={styles.gridItem}>
                                <Calendar size={16} className={styles.gridIcon} />
                                <div>
                                    <label className={styles.label}>סוג תקופה</label>
                                    <div className={styles.value}>{training.periodType}</div>
                                </div>
                            </div>
                        )}

                        {/* Game Situation (State) */}
                        {training.gameSituation && (
                            <div className={styles.gridItem}>
                                <Target size={16} className={styles.gridIcon} />
                                <div>
                                    <label className={styles.label}>מצב משחק</label>
                                    <div className={styles.value}>{training.gameSituation}</div>
                                </div>
                            </div>
                        )}

                        {/* Game Component */}
                        {training.gameComponent && (
                            <div className={styles.gridItem}>
                                <Zap size={16} className={styles.gridIcon} />
                                <div>
                                    <label className={styles.label}>מרכיב משחק</label>
                                    <div className={styles.value}>{training.gameComponent}</div>
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {training.trainingTopics && training.trainingTopics.length > 0 && (
                            <div className={styles.gridItem} style={{ gridColumn: '1 / -1' }}>
                                <Tag size={16} className={styles.gridIcon} />
                                <div>
                                    <label className={styles.label}>תגיות</label>
                                    <div className={styles.value} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                        {training.trainingTopics.map((tag, idx) => (
                                            <span key={idx} style={{
                                                fontSize: '11px',
                                                backgroundColor: 'var(--gray-100)',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {training.equipment && (
                            <div className={styles.gridItem} style={{ gridColumn: '1 / -1' }}>
                                <Briefcase size={16} className={styles.gridIcon} />
                                <div>
                                    <label className={styles.label}>ציוד נדרש</label>
                                    <div className={styles.value}>{training.equipment}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description if available */}
                    {training.description && (
                        <div className={styles.section} style={{ marginTop: '16px' }}>
                            <div className={styles.sectionTitle}>
                                <FileText size={16} />
                                <span>תיאור ומערך מלא</span>
                            </div>
                            <p className={styles.description}>{training.description}</p>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {/* Close button removed from here */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="outline" onClick={handleStatusToggle}>
                            {training.status === 'completed' ? 'סמן כלא בוצע' : 'סמן כבוצע'}
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
