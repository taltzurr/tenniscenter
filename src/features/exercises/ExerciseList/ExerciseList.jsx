import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BookOpen, MessageSquarePlus } from 'lucide-react';
import useExercisesStore from '../../../stores/exercisesStore';
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, AGE_GROUPS } from '../../../services/exercises';
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
        const value = e.target.value ? parseInt(e.target.value) : null;
        setFilters({ difficulty: value });
        fetchExercises();
    };

    const handleAgeGroupChange = (e) => {
        setFilters({ ageGroup: e.target.value || null });
        fetchExercises();
    };

    if (isLoading && exercises.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>ספריית תרגילים</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/exercise-requests">
                        <Button variant="outline">
                            <MessageSquarePlus size={18} />
                            בקשות
                        </Button>
                    </Link>
                    <Link to="/exercises/new">
                        <Button>
                            <Plus size={18} />
                            תרגיל חדש
                        </Button>
                    </Link>
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
                    <label className={styles.filterLabel}>קטגוריה</label>
                    <select
                        value={filters.category || ''}
                        onChange={handleCategoryChange}
                        className={styles.selectInput}
                    >
                        <option value="">הכל</option>
                        {EXERCISE_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>רמת קושי</label>
                    <select
                        value={filters.difficulty || ''}
                        onChange={handleDifficultyChange}
                        className={styles.selectInput}
                    >
                        <option value="">הכל</option>
                        {DIFFICULTY_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>קבוצת גיל</label>
                    <select
                        value={filters.ageGroup || ''}
                        onChange={handleAgeGroupChange}
                        className={styles.selectInput}
                    >
                        <option value="">הכל</option>
                        {AGE_GROUPS.map(age => (
                            <option key={age.value} value={age.value}>{age.label}</option>
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
