import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft } from 'lucide-react';
import { normalizeDate, formatHebrewTime } from '../../utils/dateUtils';
import { HEBREW_DAYS } from '../../config/constants';
import styles from './WeekSchedule.module.css';

function WeekSchedule({ trainings, groups, onTrainingClick }) {
    // Group trainings by day (tomorrow through end of week)
    const dayGroups = useMemo(() => {
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);

        const futureTrainings = trainings
            .filter(t => {
                const d = normalizeDate(t.date);
                return d && d > todayEnd && d <= endOfWeek;
            })
            .sort((a, b) => (normalizeDate(a.date) || 0) - (normalizeDate(b.date) || 0));

        if (futureTrainings.length === 0) return [];

        // Group by date
        const grouped = {};
        futureTrainings.forEach(t => {
            const d = normalizeDate(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!grouped[key]) {
                grouped[key] = {
                    date: d,
                    dayName: HEBREW_DAYS[d.getDay()],
                    dayNum: d.getDate(),
                    trainings: [],
                };
            }
            const group = groups?.find(g => g.id === t.groupId);
            grouped[key].trainings.push({
                ...t,
                time: formatHebrewTime(d),
                groupName: group?.name || t.groupName || 'קבוצה',
                groupColor: group?.color || null,
            });
        });

        return Object.values(grouped);
    }, [trainings, groups]);

    if (dayGroups.length === 0) return null;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <Calendar size={18} className={styles.titleIcon} />
                    <h3 className={styles.title}>המשך השבוע</h3>
                </div>
                <Link to="/calendar" className={styles.viewAll}>
                    לוח שנה מלא
                    <ChevronLeft size={14} />
                </Link>
            </div>

            <div className={styles.daysList}>
                {dayGroups.map((day, i) => (
                    <div key={i} className={styles.dayGroup}>
                        <div className={styles.dayLabel}>
                            <span className={styles.dayName}>יום {day.dayName}</span>
                            <span className={styles.dayDate}>{day.dayNum}</span>
                        </div>
                        <div className={styles.dayTrainings}>
                            {day.trainings.map(t => (
                                <div
                                    key={t.id}
                                    className={styles.trainingPill}
                                    onClick={() => onTrainingClick?.(t)}
                                >
                                    <span className={styles.pillTime}>{t.time}</span>
                                    <span className={styles.pillGroup}>{t.groupName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WeekSchedule;
