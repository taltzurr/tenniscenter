import { useState, useEffect } from 'react';
import { Plus, X, Dumbbell, Clock, Search } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import { EXERCISE_CATEGORIES } from '../../../services/exercises';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import styles from './ExercisePicker.module.css';

function ExercisePicker({ selectedExercises = [], onChange }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSelected, setTempSelected] = useState([]);

    const { exercises, fetchExercises, isLoading } = useExercisesStore();

    useEffect(() => {
        if (isModalOpen && exercises.length === 0) {
            fetchExercises();
        }
    }, [isModalOpen, exercises.length, fetchExercises]);

    const handleOpenModal = () => {
        setTempSelected([...selectedExercises]);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSearchTerm('');
    };

    const toggleExercise = (exercise) => {
        setTempSelected(prev => {
            const exists = prev.some(e => e.id === exercise.id);
            if (exists) {
                return prev.filter(e => e.id !== exercise.id);
            } else {
                return [...prev, {
                    id: exercise.id,
                    name: exercise.title || exercise.name,
                    title: exercise.title || exercise.name,
                    category: exercise.category,
                    duration: exercise.duration
                }];
            }
        });
    };

    const handleConfirm = () => {
        onChange(tempSelected);
        handleCloseModal();
    };

    const removeExercise = (exerciseId) => {
        onChange(selectedExercises.filter(e => e.id !== exerciseId));
    };

    const filteredExercises = exercises.filter(ex =>
        ex.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryLabel = (value) => {
        const cat = EXERCISE_CATEGORIES.find(c => c.value === value);
        return cat ? `${cat.emoji} ${cat.label}` : value;
    };

    return (
        <div className={styles.picker}>
            <div className={styles.header}>
                <span className={styles.title}>
                    <Dumbbell size={16} />
                    תרגילים באימון
                </span>
                <button
                    type="button"
                    className={styles.addButton}
                    onClick={handleOpenModal}
                >
                    <Plus size={16} />
                    הוסף תרגיל
                </button>
            </div>

            {selectedExercises.length > 0 ? (
                <div className={styles.selectedList}>
                    {selectedExercises.map((exercise, index) => (
                        <div key={exercise.id} className={styles.selectedItem}>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemIcon}>
                                    {index + 1}
                                </span>
                                <div className={styles.itemDetails}>
                                    <span className={styles.itemTitle}>{exercise.title}</span>
                                    <span className={styles.itemMeta}>
                                        {getCategoryLabel(exercise.category)}
                                        {exercise.duration && ` • ${exercise.duration} דק'`}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => removeExercise(exercise.id)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    לחץ על "הוסף תרגיל" לבחירת תרגילים מהספרייה
                </div>
            )}

            {/* Exercise Selection Modal */}
            {isModalOpen && (
                <div className={styles.modal} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>בחירת תרגילים</h3>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={handleCloseModal}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.searchBar}>
                                <Input
                                    placeholder="חיפוש תרגילים..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    iconStart={<Search size={16} />}
                                />
                            </div>

                            {isLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>טוען...</div>
                            ) : (
                                <div className={styles.exerciseList}>
                                    {filteredExercises.length > 0 ? (
                                        filteredExercises.map(exercise => {
                                            const isSelected = tempSelected.some(e => e.id === exercise.id);
                                            return (
                                                <div
                                                    key={exercise.id}
                                                    className={`${styles.exerciseOption} ${isSelected ? styles.selected : ''}`}
                                                    onClick={() => toggleExercise(exercise)}
                                                >
                                                    <div className={styles.itemIcon}>
                                                        <Dumbbell size={18} />
                                                    </div>
                                                    <div className={styles.exerciseDetails}>
                                                        <div className={styles.exerciseTitle}>{exercise.title}</div>
                                                        <div className={styles.exerciseMeta}>
                                                            {getCategoryLabel(exercise.category)}
                                                            {exercise.duration && (
                                                                <span style={{ marginInlineEnd: '8px' }}>
                                                                    <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                                                    {' '}{exercise.duration} דק'
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <span style={{ color: 'var(--primary-600)' }}>✓</span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={styles.emptyState}>
                                            {searchTerm ? 'לא נמצאו תרגילים תואמים' : 'אין תרגילים בספרייה'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            <Button type="button" variant="outline" onClick={handleCloseModal}>
                                ביטול
                            </Button>
                            <Button type="button" onClick={handleConfirm}>
                                הוסף ({tempSelected.length})
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExercisePicker;
