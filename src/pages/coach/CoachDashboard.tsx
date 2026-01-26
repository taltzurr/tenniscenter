/**
 * Coach Dashboard
 * Main page showing today's trainings and quick actions
 * Tiimo-style: clean, timeline-based, calming
 */

import { format, isToday, isTomorrow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Plus,
  CalendarBlank,
  CheckCircle,
  Clock,
  Users,
  CaretLeft,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';

// Mock data - will be replaced with real data from services
const mockTodayTrainings = [
  {
    id: '1',
    groupName: 'תחרותי 14-16',
    startTime: '09:00',
    endTime: '10:30',
    status: 'completed',
    periodType: 'competition',
  },
  {
    id: '2',
    groupName: 'מתקדמים',
    startTime: '11:00',
    endTime: '12:30',
    status: 'planned',
    periodType: 'general_preparation',
  },
  {
    id: '3',
    groupName: 'מתחילים',
    startTime: '16:00',
    endTime: '17:00',
    status: 'planned',
    periodType: 'specific_preparation',
  },
];

const mockStats = {
  todayTrainings: 3,
  completedToday: 1,
  weekTrainings: 12,
  groupsCount: 5,
};

export function CoachDashboard() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'בוקר טוב';
    if (hour < 17) return 'צהריים טובים';
    if (hour < 21) return 'ערב טוב';
    return 'לילה טוב';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-timeline-green border-success';
      case 'planned':
        return 'bg-timeline-blue border-primary-400';
      case 'cancelled':
        return 'bg-timeline-gray border-slate-400';
      default:
        return 'bg-timeline-blue border-primary-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'הושלם';
      case 'planned':
        return 'מתוכנן';
      case 'cancelled':
        return 'בוטל';
      default:
        return '';
    }
  };

  const todayDate = format(new Date(), 'EEEE, d בMMMM', { locale: he });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Greeting Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800">
          {getGreeting()}, {user?.displayName?.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-500">{todayDate}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          label="אימונים היום"
          value={mockStats.todayTrainings}
          icon={<CalendarBlank size={20} className="text-primary-500" />}
        />
        <StatsCard
          label="הושלמו היום"
          value={mockStats.completedToday}
          icon={<CheckCircle size={20} className="text-success" />}
        />
        <StatsCard
          label="אימונים השבוע"
          value={mockStats.weekTrainings}
          icon={<Clock size={20} className="text-info-DEFAULT" />}
        />
        <StatsCard
          label="קבוצות"
          value={mockStats.groupsCount}
          icon={<Users size={20} className="text-accent-600" />}
        />
      </div>

      {/* Quick Action */}
      <Link
        to="/coach/trainings/new"
        className="btn-primary w-full lg:w-auto"
      >
        <Plus size={20} weight="bold" />
        <span>יצירת אימון חדש</span>
      </Link>

      {/* Today's Trainings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">האימונים של היום</h2>
          <Link
            to="/coach/trainings"
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            <span>ליומן המלא</span>
            <CaretLeft size={16} />
          </Link>
        </div>

        {mockTodayTrainings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {mockTodayTrainings.map((training) => (
              <TrainingCard key={training.id} training={training} />
            ))}
          </div>
        )}
      </section>

      {/* Monthly Values - Display only */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">ערכי החודש</h2>
        <div className="flex flex-wrap gap-2">
          <ValueBadge name="משמעת" priority="high" />
          <ValueBadge name="הנאה מאימון" priority="medium" />
          <ValueBadge name="אחריות" priority="low" />
        </div>
      </section>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="card p-4 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-50">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface TrainingCardProps {
  training: {
    id: string;
    groupName: string;
    startTime: string;
    endTime: string;
    status: string;
    periodType: string;
  };
}

function TrainingCard({ training }: TrainingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-r-success bg-success-soft/30';
      case 'planned':
        return 'border-r-primary-400 bg-info-soft/30';
      default:
        return 'border-r-slate-300 bg-slate-50';
    }
  };

  return (
    <Link
      to={`/coach/trainings/${training.id}`}
      className={clsx(
        'block rounded-xl p-4 border-r-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        getStatusColor(training.status)
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-800">{training.groupName}</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {training.startTime} - {training.endTime}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {training.status === 'completed' ? (
            <span className="badge-success">
              <CheckCircle size={14} weight="fill" />
              הושלם
            </span>
          ) : (
            <span className="badge-info">מתוכנן</span>
          )}
          <CaretLeft size={20} className="text-slate-400" />
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-12">
      <div className="text-4xl mb-4">🎾</div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">
        אין אימונים היום
      </h3>
      <p className="text-slate-500 mb-6">
        זה הזמן המושלם ליצור את האימון הבא!
      </p>
      <Link to="/coach/trainings/new" className="btn-primary inline-flex">
        <Plus size={20} weight="bold" />
        <span>יצירת אימון</span>
      </Link>
    </div>
  );
}

interface ValueBadgeProps {
  name: string;
  priority: 'high' | 'medium' | 'low';
}

function ValueBadge({ name, priority }: ValueBadgeProps) {
  const colors = {
    high: 'bg-accent-100 text-accent-700 border-accent-300',
    medium: 'bg-info-soft text-info-dark border-info-DEFAULT/30',
    low: 'bg-slate-100 text-slate-600 border-slate-300',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border',
        colors[priority]
      )}
    >
      {name}
    </span>
  );
}
