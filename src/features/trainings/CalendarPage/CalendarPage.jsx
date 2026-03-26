import { useState, useEffect, useMemo, useCallback } from 'react';
import useSwipeNavigation from '../../../hooks/useSwipeNavigation';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import he from 'date-fns/locale/he';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../../styles/calendar.css';
import styles from './CalendarPage.module.css';

import useAuthStore from '../../../stores/authStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import useEventsStore from '../../../stores/eventsStore';
import useGroupsStore from '../../../stores/groupsStore';
import useCentersStore from '../../../stores/centersStore';
import { normalizeDate } from '../../../utils/dateUtils';
import { isEventVisibleForCenter, EVENT_COLORS } from '../../../services/events';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import TrainingDetailsModal from '../../dashboard/TrainingDetailsModal';
import EventDetailsModal from '../../../components/ui/EventDetailsModal/EventDetailsModal';
import { Plus } from 'lucide-react';

const locales = {
    'he': he,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), // Sunday start
    getDay,
    locales,
});

export default function CalendarPage() {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { trainings, fetchTrainings, isLoading } = useTrainingsStore();
    const { events: orgEvents, fetchEvents } = useEventsStore();
    const { groups } = useGroupsStore();
    const { centers, fetchCenters } = useCentersStore();
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const coachCenterId = userData?.centerIds?.[0] || null;

    const handleNextMonth = useCallback(() => {
        const next = new Date(date);
        next.setMonth(next.getMonth() + 1);
        setDate(next);
    }, [date]);
    const handlePrevMonth = useCallback(() => {
        const prev = new Date(date);
        prev.setMonth(prev.getMonth() - 1);
        setDate(prev);
    }, [date]);
    const swipeHandlers = useSwipeNavigation(handleNextMonth, handlePrevMonth);

    useEffect(() => {
        fetchCenters();
    }, [fetchCenters]);

    useEffect(() => {
        if (userData?.id) {
            const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
            fetchTrainings(userData.id, start, end);
            // Fetch org events for the visible months (handle year boundaries)
            const curMonth = date.getMonth();
            const curYear = date.getFullYear();
            fetchEvents(curYear, curMonth);
            const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
            const prevYear = curMonth === 0 ? curYear - 1 : curYear;
            fetchEvents(prevYear, prevMonth);
            const nextMonth = curMonth === 11 ? 0 : curMonth + 1;
            const nextYear = curMonth === 11 ? curYear + 1 : curYear;
            fetchEvents(nextYear, nextMonth);
        }
    }, [userData, date, view, fetchTrainings, fetchEvents]);

    // Filter org events for coach's center
    const visibleOrgEvents = useMemo(() => {
        return orgEvents.filter(e => isEventVisibleForCenter(e, coachCenterId));
    }, [orgEvents, coachCenterId]);

    // Combine trainings and org events into calendar events
    const trainingCalEvents = trainings.map(t => {
        const d = normalizeDate(t.date);
        return {
            id: t.id,
            title: `${d ? format(d, 'HH:mm') + ' ' : ''}${t.groupName || 'אימון'}`,
            start: d,
            end: d ? new Date(d.getTime() + (t.durationMinutes || 60) * 60000) : d,
            resource: t,
            isOrgEvent: false,
            className: t.status
        };
    });

    const orgCalEvents = visibleOrgEvents.map(e => {
        const d = e.date instanceof Date ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date));
        const endDate = e.endDate instanceof Date ? e.endDate : (e.endDate ? new Date(e.endDate) : null);
        return {
            id: `event-${e.id}`,
            title: `${e.title}`,
            start: d,
            end: endDate || d,
            allDay: !e.time,
            resource: e,
            isOrgEvent: true,
        };
    });

    const events = [...trainingCalEvents, ...orgCalEvents];

    const handleSelectEvent = (calEvent) => {
        if (calEvent.isOrgEvent) {
            setSelectedEvent(calEvent.resource);
            return;
        }
        const t = calEvent.resource;
        const tDate = normalizeDate(t.date);
        const group = groups.find(g => g.id === t.groupId);
        setSelectedTraining({
            ...t,
            day: format(tDate, 'EEEE', { locale: he }),
            fullDate: format(tDate, 'd בMMMM', { locale: he }),
            time: format(tDate, 'HH:mm'),
            duration: `${t.durationMinutes || 60} דק'`,
            group: group?.name || t.groupName || 'קבוצה',
            location: t.location || 'מגרש ראשי',
        });
    };

    const handleNewTraining = () => {
        const dateStr = format(date, 'yyyy-MM-dd');
        navigate(`/trainings/new?date=${dateStr}`);
    };

    if (isLoading && trainings.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>לוח אימונים</h1>
                <Button onClick={handleNewTraining}>
                    <Plus size={18} />
                    אימון חדש
                </Button>
            </div>

            <div className={styles.calendarCard} {...swipeHandlers}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    className={styles.calendarInner}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    culture='he'
                    rtl={true}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={(event) => {
                        if (event.isOrgEvent) {
                            const color = EVENT_COLORS[event.resource?.type] || '#6B7280';
                            return { style: { backgroundColor: color, borderRadius: '4px', border: 'none' } };
                        }
                        return {};
                    }}
                    messages={{
                        next: 'הבא',
                        previous: 'הקודם',
                        today: 'היום',
                        month: 'חודש',
                        week: 'שבוע',
                        day: 'יום',
                        agenda: 'סדר יום',
                        date: 'תאריך',
                        time: 'שעה',
                        event: 'אימון',
                        noEventsInRange: 'אין אימונים בתקופה זו',
                    }}
                />
            </div>

            <TrainingDetailsModal
                training={selectedTraining}
                isOpen={!!selectedTraining}
                onClose={() => setSelectedTraining(null)}
            />

            <EventDetailsModal
                isOpen={!!selectedEvent}
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                canEdit={false}
                centers={centers}
            />
        </div>
    );
}
