import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { HEBREW_DAYS, HEBREW_MONTHS } from '../../../config/constants';
import { formatHebrewDateShort } from '../../../utils/dateUtils';
import styles from './DateTimePicker.module.css';

const TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
    const h = 6 + Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function MiniCalendar({ selectedDate, onSelect, onClose, rangeStart, rangeEnd }) {
    const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? new Date().getMonth());
    const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? new Date().getFullYear());
    const calRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (calRef.current && !calRef.current.contains(e.target)) {
                onClose();
            }
        }
        // Delay to avoid catching the same click that opened the calendar
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const today = new Date();

    const handlePrev = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNext = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const isToday = (day) =>
        day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

    const isSelected = (day) =>
        selectedDate && day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();

    const isInRange = (day) => {
        if (!rangeStart || !rangeEnd) return false;
        const current = new Date(viewYear, viewMonth, day);
        return current > rangeStart && current < rangeEnd;
    };

    const isRangeStart = (day) => {
        if (!rangeStart) return false;
        return day === rangeStart.getDate() && viewMonth === rangeStart.getMonth() && viewYear === rangeStart.getFullYear();
    };

    const isRangeEnd = (day) => {
        if (!rangeEnd) return false;
        return day === rangeEnd.getDate() && viewMonth === rangeEnd.getMonth() && viewYear === rangeEnd.getFullYear();
    };

    return (
        <div className={styles.miniCalendar} ref={calRef}>
            <div className={styles.calHeader}>
                <button type="button" className={styles.calNavBtn} onClick={handlePrev}>
                    <ChevronRight size={18} />
                </button>
                <span className={styles.calMonthLabel}>
                    {HEBREW_MONTHS[viewMonth]} {viewYear}
                </span>
                <button type="button" className={styles.calNavBtn} onClick={handleNext}>
                    <ChevronLeft size={18} />
                </button>
            </div>
            <div className={styles.calDayHeaders}>
                {HEBREW_DAYS.map(d => (
                    <span key={d} className={styles.calDayHeader}>{d.charAt(0)}׳</span>
                ))}
            </div>
            <div className={styles.calGrid}>
                {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <span key={`e-${i}`} className={styles.calEmpty} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const classes = [styles.calDay];
                    if (isToday(day)) classes.push(styles.calToday);
                    if (isSelected(day)) classes.push(styles.calSelected);
                    if (isInRange(day)) classes.push(styles.calInRange);
                    if (isRangeStart(day)) classes.push(styles.calRangeStart);
                    if (isRangeEnd(day)) classes.push(styles.calRangeEnd);

                    return (
                        <button
                            key={day}
                            type="button"
                            className={classes.join(' ')}
                            onClick={() => {
                                onSelect(new Date(viewYear, viewMonth, day));
                                onClose();
                            }}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function TimeDropdown({ value, onSelect, onClose }) {
    const dropdownRef = useRef(null);
    const activeRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        }
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ block: 'center' });
        }
    }, []);

    // Find nearest slot for scrolling
    const nearestSlot = value || '08:00';

    return (
        <div className={styles.timeDropdown} ref={dropdownRef}>
            {TIME_SLOTS.map(slot => (
                <button
                    key={slot}
                    type="button"
                    ref={slot === nearestSlot ? activeRef : null}
                    className={`${styles.timeSlot} ${slot === value ? styles.timeSlotActive : ''}`}
                    onClick={() => {
                        onSelect(slot);
                        onClose();
                    }}
                >
                    {slot}
                </button>
            ))}
        </div>
    );
}

function DateTimePicker({ startDate, endDate, startTime, endTime, isAllDay, isRange, onChange }) {
    const [showStartCal, setShowStartCal] = useState(false);
    const [showEndCal, setShowEndCal] = useState(false);
    const [showStartTime, setShowStartTime] = useState(false);
    const [showEndTime, setShowEndTime] = useState(false);

    const closeAll = useCallback(() => {
        setShowStartCal(false);
        setShowEndCal(false);
        setShowStartTime(false);
        setShowEndTime(false);
    }, []);

    const update = (partial) => {
        onChange({
            startDate, endDate, startTime, endTime, isAllDay, isRange,
            ...partial,
        });
    };

    const handleStartDateSelect = (date) => {
        const updates = { startDate: date };
        // If end date is before new start date, push it forward
        if (endDate && date > endDate) {
            updates.endDate = date;
        }
        update(updates);
    };

    const handleEndDateSelect = (date) => {
        // If end date is before start, swap
        if (date < startDate) {
            update({ startDate: date, endDate: startDate });
        } else {
            update({ endDate: date });
        }
    };

    const toggleAllDay = () => {
        update({
            isAllDay: !isAllDay,
            startTime: !isAllDay ? '' : startTime || '08:00',
            endTime: !isAllDay ? '' : endTime || '17:00',
        });
    };

    const toggleRange = () => {
        if (isRange) {
            update({ isRange: false, endDate: null, endTime: '' });
        } else {
            // Default end date = start date + 1 day
            const nextDay = new Date(startDate);
            nextDay.setDate(nextDay.getDate() + 1);
            update({ isRange: true, endDate: nextDay, endTime: endTime || startTime || '17:00' });
        }
    };

    const startDateFormatted = startDate ? formatHebrewDateShort(startDate) : 'בחר תאריך';
    const endDateFormatted = endDate ? formatHebrewDateShort(endDate) : 'בחר תאריך סיום';

    return (
        <div className={styles.wrapper}>
            {/* Start date row */}
            <div className={styles.dateRow}>
                <div className={styles.dateTimeButtons}>
                    <div className={styles.dateButtonWrap}>
                        <button
                            type="button"
                            className={styles.dateButton}
                            onClick={() => { closeAll(); setShowStartCal(true); }}
                        >
                            <Calendar size={16} className={styles.dtIcon} />
                            <span>{startDateFormatted}</span>
                        </button>
                        {showStartCal && (
                            <MiniCalendar
                                selectedDate={startDate}
                                onSelect={handleStartDateSelect}
                                onClose={() => setShowStartCal(false)}
                                rangeStart={isRange ? startDate : null}
                                rangeEnd={isRange ? endDate : null}
                            />
                        )}
                    </div>

                    {!isAllDay && (
                        <div className={styles.timeButtonWrap}>
                            <button
                                type="button"
                                className={styles.timeButton}
                                onClick={() => { closeAll(); setShowStartTime(true); }}
                            >
                                <Clock size={14} className={styles.dtIcon} />
                                <span>{startTime || '08:00'}</span>
                            </button>
                            {showStartTime && (
                                <TimeDropdown
                                    value={startTime}
                                    onSelect={(t) => update({ startTime: t })}
                                    onClose={() => setShowStartTime(false)}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Range: separator + end date row */}
            {isRange && (
                <>
                    <div className={styles.rangeSeparator}>↓</div>
                    <div className={styles.dateRow}>
                        <div className={styles.dateTimeButtons}>
                            <div className={styles.dateButtonWrap}>
                                <button
                                    type="button"
                                    className={styles.dateButton}
                                    onClick={() => { closeAll(); setShowEndCal(true); }}
                                >
                                    <Calendar size={16} className={styles.dtIcon} />
                                    <span>{endDateFormatted}</span>
                                </button>
                                {showEndCal && (
                                    <MiniCalendar
                                        selectedDate={endDate}
                                        onSelect={handleEndDateSelect}
                                        onClose={() => setShowEndCal(false)}
                                        rangeStart={startDate}
                                        rangeEnd={endDate}
                                    />
                                )}
                            </div>

                            {!isAllDay && (
                                <div className={styles.timeButtonWrap}>
                                    <button
                                        type="button"
                                        className={styles.timeButton}
                                        onClick={() => { closeAll(); setShowEndTime(true); }}
                                    >
                                        <Clock size={14} className={styles.dtIcon} />
                                        <span>{endTime || '17:00'}</span>
                                    </button>
                                    {showEndTime && (
                                        <TimeDropdown
                                            value={endTime}
                                            onSelect={(t) => update({ endTime: t })}
                                            onClose={() => setShowEndTime(false)}
                                        />
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                className={styles.removeRange}
                                onClick={toggleRange}
                                title="הסר תאריך סיום"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Controls row */}
            <div className={styles.controlsRow}>
                <label className={styles.allDayToggle}>
                    <input
                        type="checkbox"
                        checked={isAllDay}
                        onChange={toggleAllDay}
                    />
                    <span>כל היום</span>
                </label>

                {!isRange && (
                    <button
                        type="button"
                        className={styles.addEndDate}
                        onClick={toggleRange}
                    >
                        + הוסף תאריך סיום
                    </button>
                )}
            </div>
        </div>
    );
}

export default DateTimePicker;
