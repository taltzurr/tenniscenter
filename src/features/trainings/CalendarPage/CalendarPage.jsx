import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import he from 'date-fns/locale/he';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../../styles/calendar.css';

import useAuthStore from '../../../stores/authStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
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
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        if (userData?.id) {
            // Need to figure out range based on view/date
            // For now, simplify and fetch a broad range or all (if reasonable)
            // Or fetch current month +- 1 month
            const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
            fetchTrainings(userData.id, start, end);
        }
    }, [userData, date, view, fetchTrainings]);

    const events = trainings.map(t => ({
        id: t.id,
        title: `${t.time ? format(t.date, 'HH:mm') + ' ' : ''}${t.groupName || 'אימון'}`,
        start: t.date,
        end: new Date(t.date.getTime() + (t.durationMinutes || 60) * 60000),
        resource: t,
        className: t.status // Use this for styling
    }));

    const handleSelectEvent = (event) => {
        // Navigate to training edit page
        navigate(`/trainings/${event.id}/edit`);
    };

    const handleNewTraining = () => {
        navigate('/trainings/new');
    };

    if (isLoading && trainings.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div style={{ height: 'calc(100vh - 100px)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>לוח אימונים</h1>
                <Button onClick={handleNewTraining}>
                    <Plus size={18} />
                    אימון חדש
                </Button>
            </div>

            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    culture='he'
                    rtl={true}
                    onSelectEvent={handleSelectEvent}
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
        </div>
    );
}
