import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BookOpen, MessageSquarePlus } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import useAuthStore from '../../../stores/authStore';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS } from '../../../services/exercises';
import ExerciseCard from '../ExerciseCard';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import styles from './ExerciseList.module.css';

function ExerciseList() {
    const {
        exercises,
        isLoading,
        fetchExercises,
        filters,
        setFilters
    } = useExercisesStore();
    const { userData } = useAuthStore();

    const isSupervisor = userData?.role === 'supervisor' || userData?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    useEffect(() => {
        fetchExercises();
    }, [fetchExercises]);

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            if (searchTerm !== filters.search) {
                setFilters({ search: searchTerm });
                fetchExercises();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, filters.search, setFilters, fetchExercises]);

    const handleCategoryChange = (e) => {
        setFilters({ category: e.target.value || null });
        fetchExercises();
    };

    const handleDifficultyChange = (e) => {
        const value = e.target.value || null;
        setFilters({ difficulty: value });
        fetchExercises();
    };

    if (isLoading && exercises.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>ספריית תרגילים</h1>
                <div className={styles.headerActions}>
                    {isSupervisor && (
                        <Link to="/exercise-requests">
                            <Button variant="outline" size="small">
                                <MessageSquarePlus size={16} />
                                בקשות
                            </Button>
                        </Link>
                    )}
                    {isSupervisor ? (
                        <Link to="/exercises/new">
                            <Button size="small">
                                <Plus size={16} />
                                תרגיל חדש
                            </Button>
                        </Link>
                    ) : (
                        <Link to="/exercise-requests/new">
                            <Button size="small">
                                <MessageSquarePlus size={16} />
                                הגש בקשה לתרגיל
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className={styles.filters}>
                <div className={`${styles.filterGroup} ${styles.searchInput}`}>
                    <label className={styles.filterLabel}>חיפוש</label>
                    <Input
                        type="text"
                        placeholder="חפש לפי שם תרגיל..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        iconStart={<Search size={16} />}
                        className={styles.inputField}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>מצב משחק</label>
                    <select
                        value={filters.category || ''}
                        onChange={handleCategoryChange}
                        className={styles.selectInput}
                    >
                        <option value="">הכל</option>
                        {EXERCISE_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>רמה</label>
                    <select
                        value={filters.difficulty || ''}
                        onChange={handleDifficultyChange}
                        className={styles.selectInput}
                    >
                        <option value="">הכל</option>
                        {DIFFICULTY_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>{level.emoji} {level.label}</option>
                        ))}
                    </select>
                </div>

            </div>

            {exercises.length > 0 ? (
                <div className={styles.grid}>
                    {exercises.map(exercise => (
                        <ExerciseCard key={exercise.id} exercise={exercise} />
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <BookOpen className={styles.emptyIcon} />
                    <p className={styles.emptyText}>אין תרגילים להצגה</p>
                    <Link to="/exercises/new">
                        <Button>
                            <Plus size={18} />
                            הוסף תרגיל ראשון
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default ExerciseList;
