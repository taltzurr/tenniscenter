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
                    {/* Logistics Grid */}
                    <div className={styles.sectionHeader}>
                        <span>לוגיסטיקה ופרטים כלליים</span>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.gridItem}>
                            <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                <Calendar size={18} />
                            </div>
                            <div>
                                <label className={styles.label}>יום ותאריך</label>
                                <div className={styles.value}>{training.day || '---'} | {training.time?.split(' ')[0] || '--:--'}</div>
                            </div>
                        </div>

                        <div className={styles.gridItem}>
                            <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                <Clock size={18} />
                            </div>
                            <div>
                                <label className={styles.label}>שעה ומשך</label>
                                <div className={styles.value}>{training.time} ({training.duration})</div>
                            </div>
                        </div>

                        <div className={styles.gridItem}>
                            <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                <Users size={18} />
                            </div>
                            <div>
                                <label className={styles.label}>קבוצה</label>
                                <div className={styles.value}>{training.group}</div>
                            </div>
                        </div>

                        <div className={styles.gridItem}>
                            <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                <MapPin size={18} />
                            </div>
                            <div>
                                <label className={styles.label}>מיקום</label>
                                <div className={styles.value}>{training.location}</div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className={styles.sectionHeader} style={{ marginTop: '24px' }}>
                        <span>מפרט מקצועי</span>
                    </div>
                    <div className={styles.grid}>
                        {/* Topic */}
                        <div className={styles.gridItem}>
                            <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                                <Activity size={18} />
                            </div>
                            <div>
                                <label className={styles.label}>נושא האימון</label>
                                <div className={styles.value}>{training.topic || 'לא צוין'}</div>
                            </div>
                        </div>

                        {/* Period Type */}
                        {training.periodType && (
                            <div className={styles.gridItem}>
                                <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <label className={styles.label}>סוג תקופה</label>
                                    <div className={styles.value}>{training.periodType}</div>
                                </div>
                            </div>
                        )}

                        {/* Game Situation (State) */}
                        {training.gameSituation && (
                            <div className={styles.gridItem}>
                                <div className={`${styles.iconBox} ${styles.orangeBox}`}>
                                    <Target size={18} />
                                </div>
                                <div>
                                    <label className={styles.label}>מצב משחק</label>
                                    <div className={styles.value}>{training.gameSituation}</div>
                                </div>
                            </div>
                        )}

                        {/* Game Component */}
                        {training.gameComponent && (
                            <div className={styles.gridItem}>
                                <div className={`${styles.iconBox} ${styles.orangeBox}`}>
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <label className={styles.label}>מרכיב משחק</label>
                                    <div className={styles.value}>{training.gameComponent}</div>
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {training.trainingTopics && training.trainingTopics.length > 0 && (
                            <div className={styles.gridItem} style={{ gridColumn: '1 / -1' }}>
                                <div className={`${styles.iconBox} ${styles.greenBox}`}>
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <label className={styles.label}>תגיות ואלמנטים</label>
                                    <div className={styles.value} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        {training.trainingTopics.map((tag, idx) => (
                                            <span key={idx} style={{
                                                fontSize: '11px',
                                                backgroundColor: 'var(--gray-100)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--gray-200)'
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
                                <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <label className={styles.label}>ציוד נדרש</label>
                                    <div className={styles.value}>{training.equipment}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description if available */}
                    {training.description && (
                        <div className={styles.section} style={{ marginTop: '24px' }}>
                            <div className={styles.sectionTitle}>
                                <FileText size={16} />
                                <span>תיאור ומערך מלא</span>
                            </div>
                            <p className={styles.description}>{training.description}</p>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <Button variant="secondary" onClick={handleEdit}>
                        ערוך פרטים
                    </Button>

                    <Button
                        variant={training.status === 'completed' ? 'outline' : 'primary'}
                        onClick={handleStatusToggle}
                    >
                        {training.status === 'completed' ? (
                            <><CheckCircle size={16} style={{ marginLeft: '6px' }} /> סמן כלא בוצע</>
                        ) : (
                            <><CheckCircle size={16} style={{ marginLeft: '6px' }} /> סמן כבוצע</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TrainingDetailsModal;
