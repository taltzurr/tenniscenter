/**
 * Calendar Page
 * Shows trainings in day/week/month views using FullCalendar
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, DatesSetArg } from '@fullcalendar/core';
import {
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  Plus,
  List,
  SquaresFour,
} from '@phosphor-icons/react';

import { useAuth } from '@/contexts/AuthContext';
import { trainingsService } from '@/services/trainings.service';
import { Spinner } from '@/components/ui/Spinner';
import type { Training, TrainingStatus } from '@/types';

// ============================================
// TYPES
// ============================================

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    training: Training;
  };
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_COLORS: Record<TrainingStatus, { bg: string; border: string; text: string }> = {
  draft: { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' },
  planned: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  completed: { bg: '#DCFCE7', border: '#22C55E', text: '#166534' },
  cancelled: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
};

const VIEW_OPTIONS = [
  { value: 'dayGridMonth' as CalendarView, label: 'חודש', icon: SquaresFour },
  { value: 'timeGridWeek' as CalendarView, label: 'שבוע', icon: List },
  { value: 'timeGridDay' as CalendarView, label: 'יום', icon: CalendarBlank },
];

// ============================================
// COMPONENT
// ============================================

export function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trainings for current date range
  const fetchTrainings = useCallback(async (start: Date, end: Date) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await trainingsService.getByCoachAndDateRange(user.id, {
        startDate: start,
        endDate: end,
      });
      setTrainings(data);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle date range change
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setCurrentDate(arg.start);
    fetchTrainings(arg.start, arg.end);
  }, [fetchTrainings]);

  // Convert trainings to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return trainings.map((training) => {
      const date = training.date.toDate();
      const [startHour, startMin] = training.startTime.split(':').map(Number);
      const [endHour, endMin] = training.endTime.split(':').map(Number);

      const start = new Date(date);
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date(date);
      end.setHours(endHour, endMin, 0, 0);

      const colors = STATUS_COLORS[training.status];

      return {
        id: training.id,
        title: training.groupName,
        start,
        end,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: { training },
      };
    });
  }, [trainings]);

  // Handle event click
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const training = arg.event.extendedProps.training as Training;
    // Navigate to training details/edit page
    navigate(`/coach/trainings/${training.id}`);
  }, [navigate]);

  // Handle date selection (create new training)
  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    const dateStr = format(arg.start, 'yyyy-MM-dd');
    const timeStr = format(arg.start, 'HH:mm');
    navigate(`/coach/trainings/new?date=${dateStr}&time=${timeStr}`);
  }, [navigate]);

  // Navigate months
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Format header date
  const headerDate = format(currentDate, 'MMMM yyyy', { locale: he });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לוח אימונים</h1>
          <p className="text-slate-500 text-sm mt-1">נהל את האימונים שלך</p>
        </div>

        {/* Add Training Button */}
        <button
          onClick={() => navigate('/coach/trainings/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Plus weight="bold" size={20} />
          <span>אימון חדש</span>
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-2xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="חודש הבא"
            >
              <CaretRight size={20} className="text-slate-600" />
            </button>
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="חודש קודם"
            >
              <CaretLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 min-w-[140px]">
              {headerDate}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              היום
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = currentView === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setCurrentView(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-200 border-2 border-blue-500" />
            <span className="text-slate-600">מתוכנן</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-200 border-2 border-green-500" />
            <span className="text-slate-600">הושלם</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-200 border-2 border-red-500" />
            <span className="text-slate-600">בוטל</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-400" />
            <span className="text-slate-600">טיוטה</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="calendar-wrapper relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-xl">
              <Spinner size="lg" />
            </div>
          )}

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            locale="he"
            direction="rtl"
            headerToolbar={false}
            events={calendarEvents}
            eventClick={handleEventClick}
            selectable={true}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            height="auto"
            aspectRatio={1.8}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            dayHeaderFormat={{
              weekday: 'short',
              day: 'numeric',
            }}
            nowIndicator={true}
            eventDisplay="block"
            eventBorderColor="transparent"
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n} נוספים`}
            buttonText={{
              today: 'היום',
              month: 'חודש',
              week: 'שבוע',
              day: 'יום',
            }}
            firstDay={0}
            weekends={true}
            fixedWeekCount={false}
            showNonCurrentDates={true}
            eventClassNames="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">
            {trainings.filter(t => t.status === 'planned').length}
          </div>
          <div className="text-sm text-slate-500">מתוכננים</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {trainings.filter(t => t.status === 'completed').length}
          </div>
          <div className="text-sm text-slate-500">הושלמו</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-2xl font-bold text-slate-600">
            {trainings.filter(t => t.status === 'draft').length}
          </div>
          <div className="text-sm text-slate-500">טיוטות</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {trainings.filter(t => t.status === 'cancelled').length}
          </div>
          <div className="text-sm text-slate-500">בוטלו</div>
        </div>
      </div>
    </div>
  );
}
