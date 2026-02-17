import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { format, addYears, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import Button from '../Button';
import Input from '../Input';
import styles from './RecurrencePicker.module.css';

const FREQUENCIES = {
    NONE: 'NONE',
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY'
};

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAYS_VALUE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Helper to get default end date (End of current training year: Aug 31)
const getTrainingYearEndDate = (startDate) => {
    const date = new Date(startDate);
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth(); // 0-11

    // If Sept-Dec, end is next year Aug 31. If Jan-Aug, end is this year Aug 31.
    const endYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
    return new Date(endYear, 7, 31); // Month is 0-indexed (7 = Aug)
};

/**
 * RecurrencePicker Component
 * 
 * @param {Object} value - { frequency, interval, days, endDate, endType }
 * @param {Date} startDate - The start date of the event (for defaults)
 * @param {Function} onChange - (newValue) => void
 */
function RecurrencePicker({ value, startDate, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const containerRef = useRef(null);

    // Default state for custom modal
    const [customState, setCustomState] = useState({
        frequency: FREQUENCIES.WEEKLY,
        interval: 1,
        days: [],
        endType: 'date', // 'never', 'date', 'count'
        endDate: format(getTrainingYearEndDate(startDate), 'yyyy-MM-dd'),
        count: 13
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Set default day based on start date
    useEffect(() => {
        if (startDate) {
            const startDayIndex = getDay(new Date(startDate));
            const startDayValue = DAYS_VALUE[startDayIndex];

            // If custom state days are empty, set to start day
            if (customState.days.length === 0) {
                setCustomState(prev => ({ ...prev, days: [startDayValue] }));
            }
        }
    }, [startDate]);

    const getLabel = () => {
        if (!value || value.frequency === FREQUENCIES.NONE) return 'ללא חזרה';

        if (value.frequency === FREQUENCIES.WEEKLY) {
            if (value.interval === 1 && value.days.length === 1) {
                const dayIndex = DAYS_VALUE.indexOf(value.days[0]);
                return `שבועי ביום ${DAYS_OF_WEEK[dayIndex]}`;
            }
        }

        if (value.frequency === FREQUENCIES.DAILY) return 'יומי';
        if (value.frequency === FREQUENCIES.MONTHLY) return 'חודשי';
        if (value.frequency === FREQUENCIES.YEARLY) return 'שנתי';

        return 'מותאם אישית...';
    };

    const handleQuickSelect = (type) => {
        if (type === 'CUSTOM') {
            setIsOpen(false);
            setIsCustomModalOpen(true);
            return;
        }

        const base = {
            frequency: type,
            interval: 1,
            endDate: format(getTrainingYearEndDate(startDate), 'yyyy-MM-dd'),
            endType: 'date'
        };

        if (type === FREQUENCIES.WEEKLY) {
            const dayIndex = getDay(new Date(startDate));
            base.days = [DAYS_VALUE[dayIndex]];
        } else {
            base.days = [];
        }

        if (type === FREQUENCIES.NONE) {
            onChange({ frequency: FREQUENCIES.NONE });
        } else {
            onChange(base);
        }
        setIsOpen(false);
    };

    const handleCustomSave = () => {
        onChange({
            frequency: customState.frequency,
            interval: parseInt(customState.interval),
            days: customState.frequency === FREQUENCIES.WEEKLY ? customState.days : [],
            endDate: customState.endType === 'date' ? customState.endDate : null,
            endType: customState.endType,
            count: customState.endType === 'count' ? parseInt(customState.count) : null
        });
        setIsCustomModalOpen(false);
    };

    const toggleDay = (dayVal) => {
        setCustomState(prev => {
            const exists = prev.days.includes(dayVal);
            if (exists) {
                return { ...prev, days: prev.days.filter(d => d !== dayVal) };
            } else {
                return { ...prev, days: [...prev.days, dayVal] };
            }
        });
    };

    const dayName = format(new Date(startDate), 'EEEE', { locale: he });

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                className={styles.selectButton}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{getLabel()}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.option} onClick={() => handleQuickSelect(FREQUENCIES.NONE)}>
                        ללא חזרה
                    </div>
                    <div className={styles.separator} />
                    <div className={styles.option} onClick={() => handleQuickSelect(FREQUENCIES.WEEKLY)}>
                        שבועי ביום {dayName}
                    </div>
                    <div className={styles.separator} />
                    <div className={styles.option} onClick={() => handleQuickSelect('CUSTOM')}>
                        מותאם אישית...
                    </div>
                </div>
            )}

            {isCustomModalOpen && createPortal(
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>חזרתיות מותאמת אישית</h3>

                        <div className={styles.modalRow}>
                            <span className={styles.modalLabel}>חזור כל</span>
                            <input
                                type="number"
                                min="1"
                                className={styles.numberInput}
                                value={customState.interval}
                                onChange={(e) => setCustomState({ ...customState, interval: e.target.value })}
                            />
                            <select
                                className={styles.selectInput}
                                value={customState.frequency}
                                onChange={(e) => setCustomState({ ...customState, frequency: e.target.value })}
                            >
                                <option value={FREQUENCIES.DAILY}>יום</option>
                                <option value={FREQUENCIES.WEEKLY}>שבוע</option>
                                <option value={FREQUENCIES.MONTHLY}>חודש</option>
                                <option value={FREQUENCIES.YEARLY}>שנה</option>
                            </select>
                        </div>

                        {customState.frequency === FREQUENCIES.WEEKLY && (
                            <div className={styles.modalRow} style={{ alignItems: 'flex-start' }}>
                                <span className={styles.modalLabel} style={{ marginTop: '6px' }}>בימים</span>
                                <div className={styles.daysGrid}>
                                    {DAYS_VALUE.map((val, idx) => (
                                        <div
                                            key={val}
                                            className={`${styles.dayCircle} ${customState.days.includes(val) ? styles.active : ''}`}
                                            onClick={() => toggleDay(val)}
                                        >
                                            {DAYS_OF_WEEK[idx]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.modalRow} style={{ alignItems: 'flex-start' }}>
                            <span className={styles.modalLabel} style={{ marginTop: '0' }}>סיום</span>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="endType"
                                        checked={customState.endType === 'never'}
                                        onChange={() => setCustomState({ ...customState, endType: 'never' })}
                                    />
                                    ללא סיום
                                </label>

                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="endType"
                                        checked={customState.endType === 'date'}
                                        onChange={() => setCustomState({ ...customState, endType: 'date' })}
                                    />
                                    בתאריך
                                    {customState.endType === 'date' && (
                                        <input
                                            type="date"
                                            className={styles.datePreview}
                                            value={customState.endDate}
                                            onChange={(e) => setCustomState({ ...customState, endDate: e.target.value })}
                                        />
                                    )}
                                </label>

                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="endType"
                                        checked={customState.endType === 'count'}
                                        onChange={() => setCustomState({ ...customState, endType: 'count' })}
                                    />
                                    אחרי
                                    {customState.endType === 'count' && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginInlineEnd: '12px' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                className={styles.numberInput}
                                                style={{ width: '50px' }}
                                                value={customState.count}
                                                onChange={(e) => setCustomState({ ...customState, count: e.target.value })}
                                            />
                                            <span>חזרות</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <Button variant="ghost" onClick={() => setIsCustomModalOpen(false)}>ביטול</Button>
                            <Button onClick={handleCustomSave}>סיום</Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default RecurrencePicker;
