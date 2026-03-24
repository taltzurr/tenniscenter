import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Save, Target, Heart, Plus, Trash, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import useMonthlyThemesStore from '../../../stores/monthlyThemesStore';
import useEventsStore from '../../../stores/eventsStore';
import useUIStore from '../../../stores/uiStore';
import { HEBREW_MONTHS } from '../../../services/monthlyThemes';
import { DEFAULT_GROUP_TYPES } from '../../../config/constants';
import { EVENT_TYPES, EVENT_LABELS, EVENT_COLORS } from '../../../services/events';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './EventsCalendarPage.module.css';

function EventsCalendarPage() {
    const navigate = useNavigate();
    const { userData, isSupervisor } = useAuthStore();
    const { fetchTheme, saveTheme, isLoading: themesLoading } = useMonthlyThemesStore();
    const { events, fetchEvents, addEvent, editEvent, removeEvent, isLoading: eventsLoading } = useEventsStore();
    const { addToast } = useUIStore();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const navigateMonth = useCallback((direction) => {
        let newMonth = selectedMonth + direction;
        let newYear = selectedYear;
        if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
        }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    }, [selectedMonth, selectedYear]);

    // Goals default: one empty string per group type
    const emptyGoals = () => Object.fromEntries(DEFAULT_GROUP_TYPES.map(g => [g.id, '']));

    // Themes State
    const [themesFormData, setThemesFormData] = useState({
        values: '',
        goals: emptyGoals()
    });

    // Events State
    const [showEventModal, setShowEventModal] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null); // If editing
    const [eventDate, setEventDate] = useState(null); // Selected date for new event

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            // Load Theme
            const theme = await fetchTheme(selectedYear, selectedMonth);
            if (theme) {
                // goals may be an object (new format) or array (old format → ignore)
                const goalsData = theme.goals && !Array.isArray(theme.goals) ? theme.goals : {};
                setThemesFormData({
                    values: Array.isArray(theme.values) ? theme.values.join(', ') : '',
                    goals: { ...emptyGoals(), ...goalsData }
                });
            } else {
                setThemesFormData({ values: '', goals: emptyGoals() });
            }

            // Load Events
            // Center managers see only their center's events, supervisors see all
            const centerId = isSupervisor() ? null : userData?.managedCenterId;
            await fetchEvents(selectedYear, selectedMonth, centerId);
        };
        loadData();
    }, [selectedYear, selectedMonth, fetchTheme, fetchEvents, userData?.managedCenterId, isSupervisor]);

    // Theme Handlers
    const handleSaveThemes = async (e) => {
        e.preventDefault();
        // Filter out empty goal entries
        const filteredGoals = Object.fromEntries(
            Object.entries(themesFormData.goals).filter(([, v]) => v.trim())
        );
        const result = await saveTheme({
            year: selectedYear,
            month: selectedMonth,
            values: themesFormData.values.split(',').map(s => s.trim()).filter(Boolean),
            goals: filteredGoals
        });

        if (result.success) {
            addToast({ type: 'success', message: 'הגדרות חודשיות נשמרו' });
        } else {
            addToast({ type: 'error', message: 'שגיאה בשמירה' });
        }
    };

    // Event Helpers
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 = Sunday

    const handleDayClick = (day) => {
        setEventDate(day);
        setCurrentEvent(null);
        setShowEventModal(true);
    };

    const handleEventClick = (e, event) => {
        e.stopPropagation();
        setCurrentEvent(event);
        setShowEventModal(true);
    };

    const handleDeleteEvent = async () => {
        if (currentEvent && confirm('למחוק את האירוע?')) {
            const res = await removeEvent(currentEvent.id);
            if (res.success) {
                setShowEventModal(false);
                addToast({ type: 'success', message: 'האירוע נמחק' });
            }
        }
    };

    const EventModalContent = () => {
        const [formData, setModalFormData] = useState({
            title: currentEvent?.title || '',
            type: currentEvent?.type || EVENT_TYPES.HOLIDAY,
            description: currentEvent?.description || ''
        });

        const handleSubmit = async (e) => {
            e.preventDefault();
            const date = currentEvent ? new Date(currentEvent.date.seconds * 1000) : new Date(selectedYear, selectedMonth, eventDate);

            const eventPayload = {
                ...formData,
                date: date,
                year: selectedYear,
                month: selectedMonth,
                // Add centerId for center-specific events
                centerId: userData?.managedCenterId || null
            };

            let res;
            if (currentEvent) {
                res = await editEvent(currentEvent.id, eventPayload);
            } else {
                res = await addEvent(eventPayload);
            }

            if (res.success) {
                setShowEventModal(false);
                addToast({ type: 'success', message: currentEvent ? 'האירוע עודכן' : 'האירוע נוצר' });
            }
        };

        return (
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>כותרת האירוע</label>
                    <input
                        className={styles.input}
                        value={formData.title}
                        onChange={e => setModalFormData({ ...formData, title: e.target.value })}
                        required
                        autoFocus
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>סוג אירוע</label>
                    <select
                        className={styles.input}
                        value={formData.type}
                        onChange={e => setModalFormData({ ...formData, type: e.target.value })}
                    >
                        {Object.entries(EVENT_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>תיאור (אופציונלי)</label>
                    <textarea
                        className={styles.textarea}
                        value={formData.description}
                        onChange={e => setModalFormData({ ...formData, description: e.target.value })}
                        rows={3}
                    />
                </div>

                <div className={styles.modalActions}>
                    {currentEvent && (
                        <Button type="button" variant="danger" onClick={handleDeleteEvent}>
                            <Trash size={16} /> מחק
                        </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={() => setShowEventModal(false)}>
                        ביטול
                    </Button>
                    <Button type="submit">
                        {currentEvent ? 'שמור שינויים' : 'צור אירוע'}
                    </Button>
                </div>
            </form>
        );
    };

    // Render Calendar
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
        const days = [];

        // Empty cells for days before start of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.dayCell} style={{ background: 'var(--gray-50)' }}></div>);
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateEvents = events.filter(e => {
                const d = e.date?.seconds ? new Date(e.date.seconds * 1000) : e.date;
                return d.getDate() === day;
            });

            const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === selectedMonth &&
                new Date().getFullYear() === selectedYear;

            days.push(
                <div
                    key={day}
                    className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
                    onClick={() => handleDayClick(day)}
                >
                    <span className={styles.dayNumber}>{day}</span>
                    <div className={styles.dayContent}>
                        {dateEvents.map(event => (
                            <div
                                key={event.id}
                                className={styles.eventPill}
                                style={{ backgroundColor: EVENT_COLORS[event.type] || EVENT_COLORS.OTHER }}
                                onClick={(e) => handleEventClick(e, event)}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.calendarGrid}>
                <div className={styles.weekHeader}>ראשון</div>
                <div className={styles.weekHeader}>שני</div>
                <div className={styles.weekHeader}>שלישי</div>
                <div className={styles.weekHeader}>רביעי</div>
                <div className={styles.weekHeader}>חמישי</div>
                <div className={styles.weekHeader}>שישי</div>
                <div className={styles.weekHeader}>שבת</div>
                {days}
            </div>
        );
    };

    const isLoading = themesLoading || eventsLoading;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
                    <ArrowRight size={20} /> חזרה לדאשבורד
                </button>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.title}>מטרות וערכים</h1>
                        <p className={styles.subtitle}>הגדרת מטרות חודשיות לפי סוג קבוצה, ערכים ואירועים</p>
                    </div>
                    {/* Month/Year navigation with arrows */}
                    <div className={styles.monthNav}>
                        <button
                            className={styles.monthNavBtn}
                            onClick={() => navigateMonth(-1)}
                            aria-label="חודש קודם"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <span className={styles.monthLabel}>
                            {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                        </span>
                        <button
                            className={styles.monthNavBtn}
                            onClick={() => navigateMonth(1)}
                            aria-label="חודש הבא"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.container}>
                {/* Left: Interactive Calendar */}
                <div className={styles.calendarSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 className={styles.cardTitle}>לוח שנה ארגוני</h2>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                            {Object.entries(EVENT_LABELS).map(([key, label]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: EVENT_COLORS[key] }}></div>
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {renderCalendar()}
                </div>

                {/* Right: Themes & Goals */}
                <div className={styles.themesSidebar}>
                    <form onSubmit={handleSaveThemes}>
                        {/* Monthly Values */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Heart className={styles.cardIcon} size={20} color="var(--primary-600)" />
                                <h2 className={styles.cardTitle}>ערכי החודש</h2>
                            </div>
                            <input
                                className={styles.input}
                                placeholder="לדוגמה: התמדה, כבוד..."
                                value={themesFormData.values}
                                onChange={(e) => setThemesFormData(prev => ({ ...prev, values: e.target.value }))}
                            />
                            {themesFormData.values && (
                                <div className={styles.previewTags}>
                                    {themesFormData.values.split(',').filter(Boolean).map((t, i) => (
                                        <span key={i} className={styles.tag}>{t}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Monthly Goals by group type */}
                        <div className={styles.card} style={{ marginTop: '1.5rem' }}>
                            <div className={styles.cardHeader}>
                                <Target className={styles.cardIcon} size={20} color="var(--accent-500)" />
                                <h2 className={styles.cardTitle}>מטרות החודש לפי סוג קבוצה</h2>
                            </div>
                            <div className={styles.goalsGroupForm}>
                                {DEFAULT_GROUP_TYPES.map((groupType) => (
                                    <div key={groupType.id} className={styles.goalGroupRow}>
                                        <label className={styles.goalGroupLabel}>{groupType.name}</label>
                                        <input
                                            className={styles.input}
                                            placeholder={`מטרת חודש ל${groupType.name}...`}
                                            value={themesFormData.goals[groupType.id] || ''}
                                            onChange={(e) => setThemesFormData(prev => ({
                                                ...prev,
                                                goals: { ...prev.goals, [groupType.id]: e.target.value }
                                            }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <Button type="submit" disabled={themesLoading}>
                                <Save size={18} /> שמור הגדרות
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Event Modal */}
            <Modal
                isOpen={showEventModal}
                onClose={() => setShowEventModal(false)}
                title={currentEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
            >
                <EventModalContent />
            </Modal>
        </div>
    );
}

export default EventsCalendarPage;
