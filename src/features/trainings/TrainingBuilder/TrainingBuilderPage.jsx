import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ChevronRight, Save, Play, Plus, Search } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { SessionTimelineItem } from './SessionTimeline';
import { ExecutionMode } from './ExecutionMode';
import useTrainingsStore from '../../../stores/trainingsStore';
import useExercisesStore from '../../../stores/exercisesStore';
import styles from './TrainingBuilder.module.css';

function TrainingBuilderPage() {
    const { trainingId } = useParams();
    const navigate = useNavigate();
    const { trainings, editTraining, fetchTraining } = useTrainingsStore();
    const { exercises: libraryExercises, fetchExercises } = useExercisesStore();

    const [training, setTraining] = useState(null);
    const [sessionExercises, setSessionExercises] = useState([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isExecutionMode, setIsExecutionMode] = useState(false);

    useEffect(() => {
        const loadTraining = async () => {
            let found = trainings.find(t => t.id === trainingId);

            if (!found) {
                // Not in store? Fetch it.
                found = await fetchTraining(trainingId);
            }

            if (found) {
                setTraining(found);
                // Ensure exercises is an array
                setSessionExercises(found.exercises || []);
            }
        };

        loadTraining();

        // Fetch library
        fetchExercises();
    }, [trainingId, trainings, fetchExercises, fetchTraining]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event) {
        const { active, over } = event;
        if (active.id !== over.id) {
            setSessionExercises((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const handleUpdateExercise = (id, updates) => {
        setSessionExercises(items => items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleRemoveExercise = (id) => {
        setSessionExercises(items => items.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await editTraining(trainingId, { exercises: sessionExercises });
            // Optional: Toast success
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFromLibrary = (libExercise) => {
        const newExercise = {
            id: Math.random().toString(36).substr(2, 9), // Unique ID for this instance in the session
            exerciseId: libExercise.id, // Reference to original
            name: libExercise.name,
            duration: '',
            notes: '',
            // Copy other defaults if needed
        };
        setSessionExercises([...sessionExercises, newExercise]);
        setIsPickerOpen(false);
    };

    if (!training) return <div className={styles.page}>Loading...</div>;

    if (isExecutionMode) {
        return (
            <ExecutionMode
                exercises={sessionExercises}
                onClose={() => setIsExecutionMode(false)}
            />
        );
    }

    const filteredLibrary = libraryExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate(-1)}>
                    <ChevronRight size={24} />
                </button>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>בניית אימון</h1>
                    <span className={styles.subtitle}>{training.groupName} • {new Date(training.date?.seconds * 1000 || training.date).toLocaleDateString()}</span>
                </div>
                <div className={styles.actions}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={18} />
                        {isSaving ? '...' : ''}
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsExecutionMode(true)}
                        disabled={sessionExercises.length === 0}
                    >
                        <Play size={18} />
                    </Button>
                </div>
            </div>

            <div className={styles.timelineContainer}>
                {sessionExercises.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>האימון ריק. הוסף תרגילים כדי להתחיל.</p>
                        <Button onClick={() => setIsPickerOpen(true)}>
                            <Plus size={18} />
                            הוסף תרגיל
                        </Button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sessionExercises}
                            strategy={verticalListSortingStrategy}
                        >
                            {sessionExercises.map(exercise => (
                                <SessionTimelineItem
                                    key={exercise.id}
                                    id={exercise.id}
                                    exercise={exercise}
                                    duration={exercise.duration}
                                    notes={exercise.notes}
                                    onUpdate={handleUpdateExercise}
                                    onRemove={handleRemoveExercise}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}

                {sessionExercises.length > 0 && (
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
                        <Button variant="ghost" onClick={() => setIsPickerOpen(true)}>
                            <Plus size={18} />
                            הוסף עוד תרגיל
                        </Button>
                    </div>
                )}
            </div>

            {/* Exercise Picker Modal */}
            {isPickerOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsPickerOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>בחר תרגיל</h2>
                            <div className={styles.searchContainer}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="חפש תרגיל..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>

                        <div className={styles.libraryList}>
                            {filteredLibrary.map(ex => (
                                <div
                                    key={ex.id}
                                    className={styles.libraryItem}
                                    onClick={() => handleAddFromLibrary(ex)}
                                >
                                    <span>{ex.name}</span>
                                    <Plus size={16} />
                                </div>
                            ))}
                            {filteredLibrary.length === 0 && (
                                <p className={styles.emptySearch}>לא נמצאו תרגילים</p>
                            )}
                        </div>

                        <Button variant="ghost" className={styles.closeModalBtn} onClick={() => setIsPickerOpen(false)}>סגור</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TrainingBuilderPage;
