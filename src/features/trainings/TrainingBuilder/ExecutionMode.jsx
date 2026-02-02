import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Play, Pause, RotateCcw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import styles from './ExecutionMode.module.css';

export function ExecutionMode({ exercises, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);

    const currentExercise = exercises[currentIndex];
    const nextExercise = exercises[currentIndex + 1];

    useEffect(() => {
        if (currentExercise) {
            setTimeLeft(parseInt(currentExercise.duration || 0) * 60);
            setIsActive(false);
        }
    }, [currentIndex, currentExercise]);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => setTimeLeft(parseInt(currentExercise.duration || 0) * 60);

    const handleNext = () => {
        if (currentIndex < exercises.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!currentExercise) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.progress}>
                        תרגיל {currentIndex + 1} מתוך {exercises.length}
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </header>

                <main className={styles.mainContent}>
                    <h1 className={styles.exerciseTitle}>{currentExercise.name}</h1>
                    {currentExercise.notes && (
                        <p className={styles.notes}>{currentExercise.notes}</p>
                    )}

                    <div className={styles.timerContainer}>
                        <div className={styles.timerDisplay}>
                            {formatTime(timeLeft)}
                        </div>
                        <div className={styles.timerControls}>
                            <button className={styles.controlBtn} onClick={toggleTimer}>
                                {isActive ? <Pause size={32} /> : <Play size={32} />}
                            </button>
                            <button className={styles.resetBtn} onClick={resetTimer}>
                                <RotateCcw size={24} />
                            </button>
                        </div>
                    </div>
                </main>

                <footer className={styles.footer}>
                    <button
                        className={styles.navBtn}
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                    >
                        <ChevronRight size={24} />
                        הקודם
                    </button>

                    {nextExercise ? (
                        <div className={styles.nextPreview} onClick={handleNext}>
                            <span className={styles.nextLabel}>הבא:</span>
                            <span className={styles.nextName}>{nextExercise.name}</span>
                            <ChevronLeft size={20} />
                        </div>
                    ) : (
                        <button className={styles.finishBtn} onClick={onClose}>
                            סיום אימון
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
