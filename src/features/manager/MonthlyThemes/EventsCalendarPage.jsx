import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useSwipeNavigation from '../../../hooks/useSwipeNavigation';
import { ArrowRight, Save, Target, Heart, Plus, Trash, Clock, ChevronRight, ChevronLeft, ChevronDown, Building2, Check, CalendarDays } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import useMonthlyThemesStore from '../../../stores/monthlyThemesStore';
import useEventsStore from '../../../stores/eventsStore';
import useCentersStore from '../../../stores/centersStore';
import useUIStore from '../../../stores/uiStore';
import { HEBREW_MONTHS } from '../../../services/monthlyThemes';
import { DEFAULT_GROUP_TYPES } from '../../../config/constants';
import { EVENT_TYPES, EVENT_LABELS, EVENT_COLORS } from '../../../services/events';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal/Modal';
import EventDetailsModal from '../../../components/ui/EventDetailsModal/EventDetailsModal';
import DateTimePicker from '../../../components/ui/DateTimePicker/DateTimePicker';
import { normalizeDate } from '../../../utils/dateUtils';
import styles from './EventsCalendarPage.module.css';

function EventsCalendarPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const calendarRef = useRef(null);
    const { userData, isSupervisor, isCenterManager } = useAuthStore();
    const { fetchTheme, saveTheme, isLoading: themesLoading } = useMonthlyThemesStore();
    const { events, fetchEvents, addEvent, editEvent, removeEvent, isLoading: eventsLoading } = useEventsStore();
    const { centers, fetchCenters } = useCentersStore();
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

    const handleNextMonth = useCallback(() => navigateMonth(1), [navigateMonth]);
    const handlePrevMonth = useCallback(() => navigateMonth(-1), [navigateMonth]);
    const swipeHandlers = useSwipeNavigation(handleNextMonth, handlePrevMonth);

    // Goals default: one empty string per group type
    const emptyGoals = () => Object.fromEntries(DEFAULT_GROUP_TYPES.map(g => [g.id, '']));

    // Themes State
    const [themesFormData, setThemesFormData] = useState({
        values: '',
        goals: emptyGoals()
    });

    // Center filter (supervisors can filter by center - multi-select)
    const [selectedCenterIds, setSelectedCenterIds] = useState([]);
    const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
    const centerDropdownRef = useRef(null);

    // Events State
    const [showEventModal, setShowEventModal] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null); // If editing
    const [eventDate, setEventDate] = useState(null); // Selected date for new event
    const [detailEvent, setDetailEvent] = useState(null);

    // Scroll to calendar section if hash is #calendar
    useEffect(() => {
        if (location.hash === '#calendar' && calendarRef.current) {
            setTimeout(() => {
                calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [location.hash]);

    const isCM = isCenterManager();
    const managedCenterId = userData?.managedCenterId;

    // Fetch centers list for supervisor filter or center manager name display
    useEffect(() => {
        if (isSupervisor() || isCM) {
            fetchCenters();
        }
    }, [isSupervisor, isCM, fetchCenters]);

    // Close center dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (centerDropdownRef.current && !centerDropdownRef.current.contains(e.target)) {
                setCenterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            await fetchEvents(selectedYear, selectedMonth);
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
        setDetailEvent(event);
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
            description: currentEvent?.description || '',
            centerIds: currentEvent?.centerIds || (isCM && managedCenterId ? [managedCenterId] : []),
            location: currentEvent?.location || '',
        });

        const [modalCenterOpen, setModalCenterOpen] = useState(false);
        const modalCenterRef = useRef(null);

        useEffect(() => {
            function handleClickOutside(e) {
                if (modalCenterRef.current && !modalCenterRef.current.contains(e.target)) {
                    setModalCenterOpen(false);
                }
            }
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const [dateTimeState, setDateTimeState] = useState(() => {
            const existingStart = currentEvent?.date ? normalizeDate(currentEvent.date) : null;
            const existingEnd = currentEvent?.endDate ? normalizeDate(currentEvent.endDate) : null;
            return {
                startDate: existingStart || new Date(selectedYear, selectedMonth, eventDate),
                endDate: existingEnd || null,
                startTime: currentEvent?.time || '',
                endTime: currentEvent?.endTime || '',
                isAllDay: !currentEvent?.time,
                isRange: !!existingEnd,
            };
        });

        const handleSubmit = async (e) => {
            e.preventDefault();

            const eventPayload = {
                ...formData,
                date: dateTimeState.startDate,
                endDate: dateTimeState.isRange ? dateTimeState.endDate : null,
                time: dateTimeState.isAllDay ? '' : dateTimeState.startTime,
                endTime: dateTimeState.isAllDay ? '' : (dateTimeState.isRange ? dateTimeState.endTime : ''),
                year: dateTimeState.startDate.getFullYear(),
                month: dateTimeState.startDate.getMonth(),
                centerIds: formData.centerIds,
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
                // Re-fetch to ensure proper Firestore timestamp normalization
                fetchEvents(selectedYear, selectedMonth);
            }
        };

        const toggleCenter = (centerId) => {
            setModalFormData(prev => ({
                ...prev,
                centerIds: prev.centerIds.includes(centerId)
                    ? prev.centerIds.filter(id => id !== centerId)
                    : [...prev.centerIds, centerId]
            }));
        };

        return (
            <>
                <Modal.Body>
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

                    {/* Center selection - supervisor sees multi-select dropdown, CM sees locked to their center */}
                    {isCM ? (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>מרכז</label>
                            <div className={styles.lockedCenter}>
                                {centers.find(c => c.id === managedCenterId)?.name || 'המרכז שלך'}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>מרכזים</label>
                            <div className={styles.centerDropdown} ref={modalCenterRef}>
                                <button
                                    type="button"
                                    className={`${styles.centerDropdownTrigger} ${styles.centerDropdownTriggerModal} ${modalCenterOpen ? styles.centerDropdownTriggerOpen : ''}`}
                                    onClick={() => setModalCenterOpen(!modalCenterOpen)}
                                >
                                    <Building2 size={16} />
                                    {formData.centerIds.length === 0
                                        ? 'כל המרכזים'
                                        : `${formData.centerIds.length} מרכזים`}
                                    {formData.centerIds.length > 0 && (
                                        <span className={styles.centerDropdownCount}>{formData.centerIds.length}</span>
                                    )}
                                    <ChevronDown
                                        size={16}
                                        className={`${styles.centerDropdownArrow} ${modalCenterOpen ? styles.centerDropdownArrowOpen : ''}`}
                                    />
                                </button>
                                {modalCenterOpen && (
                                    <div className={`${styles.centerDropdownPanel} ${styles.centerDropdownPanelModal}`}>
                                        <button
                                            type="button"
                                            className={`${styles.centerDropdownItem} ${formData.centerIds.length === 0 ? styles.centerDropdownItemActive : ''}`}
                                            onClick={() => setModalFormData({ ...formData, centerIds: [] })}
                                        >
                                            <div className={`${styles.centerDropdownCheckbox} ${formData.centerIds.length === 0 ? styles.centerDropdownCheckboxChecked : ''}`}>
                                                {formData.centerIds.length === 0 && <Check size={12} color="white" />}
                                            </div>
                                            <Building2 size={14} />
                                            כל המרכזים
                                        </button>
                                        <div className={styles.centerDropdownDivider} />
                                        {centers.map(c => {
                                            const isActive = formData.centerIds.includes(c.id);
                                            return (
                                                <button
                                                    type="button"
                                                    key={c.id}
                                                    className={`${styles.centerDropdownItem} ${isActive ? styles.centerDropdownItemActive : ''}`}
                                                    onClick={() => toggleCenter(c.id)}
                                                >
                                                    <div className={`${styles.centerDropdownCheckbox} ${isActive ? styles.centerDropdownCheckboxChecked : ''}`}>
                                                        {isActive && <Check size={12} color="white" />}
                                                    </div>
                                                    <Building2 size={14} />
                                                    {c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Date + Time picker */}
                    <DateTimePicker
                        startDate={dateTimeState.startDate}
                        endDate={dateTimeState.endDate}
                        startTime={dateTimeState.startTime}
                        endTime={dateTimeState.endTime}
                        isAllDay={dateTimeState.isAllDay}
                        isRange={dateTimeState.isRange}
                        onChange={setDateTimeState}
                    />

                    {/* Location */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>מיקום (אופציונלי)</label>
                        <input
                            className={styles.input}
                            value={formData.location}
                            onChange={e => setModalFormData({ ...formData, location: e.target.value })}
                            placeholder="לדוגמה: מגרש 3"
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    {currentEvent && (
                        <Button type="button" variant="danger" onClick={handleDeleteEvent}>
                            <Trash size={16} /> מחק
                        </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={() => setShowEventModal(false)}>
                        ביטול
                    </Button>
                    <Button type="submit" onClick={handleSubmit}>
                        {currentEvent ? 'שמור שינויים' : 'צור אירוע'}
                    </Button>
                </Modal.Footer>
            </>
        );
    };

    const MAX_VISIBLE_EVENTS = 3;

    // Render Calendar
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
        const days = [];

        // Empty cells for days before start of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.emptyCell}></div>);
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateEvents = events.filter(e => {
                const d = e.date instanceof Date ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date));
                const end = e.endDate instanceof Date ? e.endDate : (e.endDate ? new Date(e.endDate) : null);

                const currentDate = new Date(selectedYear, selectedMonth, day);
                const startMatch = d.getFullYear() === selectedYear && d.getMonth() === selectedMonth && d.getDate() === day;
                const inRange = end && currentDate >= d && currentDate <= end;

                if (!startMatch && !inRange) return false;

                // Center manager: show global events + events targeting their center
                if (isCM && managedCenterId) {
                    if (!e.centerIds || e.centerIds.length === 0) return true; // Global events
                    return e.centerIds.includes(managedCenterId);
                }

                // Supervisor: apply center filter if selected
                if (isSupervisor() && selectedCenterIds.length > 0) {
                    if (e.centerIds && e.centerIds.length > 0) {
                        return e.centerIds.some(cid => selectedCenterIds.includes(cid));
                    }
                    return true; // Global events always show
                }
                return true;
            });

            const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === selectedMonth &&
                new Date().getFullYear() === selectedYear;

            const visibleEvents = dateEvents.slice(0, MAX_VISIBLE_EVENTS);
            const hiddenCount = dateEvents.length - MAX_VISIBLE_EVENTS;

            days.push(
                <div
                    key={day}
                    className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
                    onClick={() => handleDayClick(day)}
                >
                    <span className={styles.dayNumber}>{day}</span>
                    <div className={styles.dayContent}>
                        {visibleEvents.map(event => (
                            <div
                                key={event.id}
                                className={styles.eventPill}
                                style={{ backgroundColor: EVENT_COLORS[event.type] || EVENT_COLORS.OTHER }}
                                onClick={(e) => handleEventClick(e, event)}
                            >
                                {event.title}
                            </div>
                        ))}
                        {hiddenCount > 0 && (
                            <div className={styles.moreIndicator}>
                                +{hiddenCount} עוד
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.calendarContainer}>
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
                <h1 className={styles.title}>{isCM ? 'לוח אירועים' : 'לוח אירועים, מטרות וערכים'}</h1>
                <p className={styles.subtitle}>{isCM ? 'ניהול אירועים למרכז שלך' : 'ניהול אירועים, מטרות חודשיות לפי סוג קבוצה וערכים'}</p>
                {/* Month/Year navigation with arrows */}
                <div className={styles.monthSelector}>
                    <button
                        className={styles.navButton}
                        onClick={() => navigateMonth(-1)}
                        aria-label="חודש קודם"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <span className={`${styles.monthTitle} ${selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? styles.monthTitleCurrent : ''}`}>
                        {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                    </span>
                    <button
                        className={styles.navButton}
                        onClick={() => navigateMonth(1)}
                        aria-label="חודש הבא"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>
            </div>

            <div className={styles.container}>
                {/* Left: Interactive Calendar */}
                <div ref={calendarRef} className={styles.calendarSection} {...swipeHandlers}>
                    <div className={styles.pageSectionHeader}>
                        <CalendarDays size={18} className={styles.pageSectionIcon} />
                        <h2 className={styles.pageSectionTitle}>לוח שנה ארגוני</h2>
                    </div>
                    <div className={styles.calendarHeader}>
                        <div className={styles.calendarLegend}>
                            {Object.entries(EVENT_LABELS).map(([key, label]) => (
                                <div key={key} className={styles.legendItem}>
                                    <div className={styles.legendDot} style={{ backgroundColor: EVENT_COLORS[key] }}></div>
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Center filter dropdown for supervisors (multi-select) */}
                    {isSupervisor() && centers.length > 0 && (
                        <div className={styles.centerDropdown} ref={centerDropdownRef}>
                            <button
                                className={`${styles.centerDropdownTrigger} ${centerDropdownOpen ? styles.centerDropdownTriggerOpen : ''}`}
                                onClick={() => setCenterDropdownOpen(!centerDropdownOpen)}
                            >
                                <Building2 size={16} />
                                {selectedCenterIds.length === 0
                                    ? 'כל המרכזים'
                                    : `${selectedCenterIds.length} מרכזים`}
                                {selectedCenterIds.length > 0 && (
                                    <span className={styles.centerDropdownCount}>{selectedCenterIds.length}</span>
                                )}
                                <ChevronDown
                                    size={16}
                                    className={`${styles.centerDropdownArrow} ${centerDropdownOpen ? styles.centerDropdownArrowOpen : ''}`}
                                />
                            </button>
                            {centerDropdownOpen && (
                                <div className={styles.centerDropdownPanel}>
                                    <button
                                        className={`${styles.centerDropdownItem} ${selectedCenterIds.length === 0 ? styles.centerDropdownItemActive : ''}`}
                                        onClick={() => { setSelectedCenterIds([]); }}
                                    >
                                        <div className={`${styles.centerDropdownCheckbox} ${selectedCenterIds.length === 0 ? styles.centerDropdownCheckboxChecked : ''}`}>
                                            {selectedCenterIds.length === 0 && <Check size={12} color="white" />}
                                        </div>
                                        <Building2 size={14} />
                                        כל המרכזים
                                    </button>
                                    <div className={styles.centerDropdownDivider} />
                                    {centers.map(c => {
                                        const isActive = selectedCenterIds.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                className={`${styles.centerDropdownItem} ${isActive ? styles.centerDropdownItemActive : ''}`}
                                                onClick={() => setSelectedCenterIds(prev =>
                                                    prev.includes(c.id)
                                                        ? prev.filter(id => id !== c.id)
                                                        : [...prev, c.id]
                                                )}
                                            >
                                                <div className={`${styles.centerDropdownCheckbox} ${isActive ? styles.centerDropdownCheckboxChecked : ''}`}>
                                                    {isActive && <Check size={12} color="white" />}
                                                </div>
                                                <Building2 size={14} />
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    {renderCalendar()}
                </div>

                {/* Right: Themes & Goals - supervisor only */}
                {!isCM && (
                    <div className={styles.themesSidebar}>
                        <form onSubmit={handleSaveThemes}>
                            {/* Monthly Values */}
                            <div className={styles.pageSectionHeader}>
                                <Heart size={18} className={styles.pageSectionIcon} />
                                <h2 className={styles.pageSectionTitle}>ערכי החודש</h2>
                            </div>
                            <div className={styles.card}>
                                <input
                                    className={styles.input}
                                    placeholder="לדוגמה: התמדה, כבוד..."
                                    value={themesFormData.values}
                                    onChange={(e) => setThemesFormData(prev => ({ ...prev, values: e.target.value }))}
                                />
                                {themesFormData.values && (
                                    <div className={styles.previewTags}>
                                        {themesFormData.values.split(',').filter(Boolean).map((t, i) => (
                                            <span key={i} className={`${styles.tag} ${styles.tagValue}`}>{t.trim()}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Monthly Goals by group type */}
                            <div className={styles.pageSectionHeader}>
                                <Target size={18} className={styles.pageSectionIcon} />
                                <h2 className={styles.pageSectionTitle}>מטרות החודש</h2>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.goalsGroupForm}>
                                    {DEFAULT_GROUP_TYPES.map((groupType) => {
                                        const goalValue = themesFormData.goals[groupType.id] || '';
                                        return (
                                            <div key={groupType.id} className={styles.goalGroupRow}>
                                                <label className={styles.goalGroupLabel}>{groupType.name}</label>
                                                <input
                                                    className={styles.input}
                                                    placeholder={`מטרת חודש ל${groupType.name}...`}
                                                    value={goalValue}
                                                    onChange={(e) => setThemesFormData(prev => ({
                                                        ...prev,
                                                        goals: { ...prev.goals, [groupType.id]: e.target.value }
                                                    }))}
                                                />
                                                {goalValue.trim() && (
                                                    <div className={styles.previewTags}>
                                                        <span className={`${styles.tag} ${styles.tagGoal}`}>{goalValue.trim()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={styles.actions}>
                                <Button type="submit" disabled={themesLoading}>
                                    <Save size={18} /> שמור הגדרות
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Event Modal */}
            <Modal
                isOpen={showEventModal}
                onClose={() => setShowEventModal(false)}
                title={currentEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
            >
                <EventModalContent />
            </Modal>

            {/* Event Details Modal */}
            <EventDetailsModal
                isOpen={!!detailEvent}
                event={detailEvent}
                onClose={() => setDetailEvent(null)}
                canEdit={isCM ? (detailEvent?.centerIds?.includes(managedCenterId)) : true}
                onEdit={() => {
                    setCurrentEvent(detailEvent);
                    setDetailEvent(null);
                    setShowEventModal(true);
                }}
                onDelete={async () => {
                    if (confirm('למחוק את האירוע?')) {
                        const res = await removeEvent(detailEvent.id);
                        if (res.success) {
                            setDetailEvent(null);
                            addToast({ type: 'success', message: 'האירוע נמחק' });
                        }
                    }
                }}
                centers={centers}
            />
        </div>
    );
}

export default EventsCalendarPage;
