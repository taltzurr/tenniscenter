/**
 * Group Details Page
 * View group info, trainings, and coach history
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  ArrowRight,
  Users,
  CalendarBlank,
  Clock,
  TrendUp,
  ChartBar,
  CaretLeft,
  Plus,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

import { useAuth } from '@/contexts/AuthContext';
import { groupsService } from '@/services/groups.service';
import { trainingsService } from '@/services/trainings.service';
import { Spinner } from '@/components/ui/Spinner';
import type { Group, Training, TrainingStatus, CoachHistoryEntry } from '@/types';

// ============================================
// CONSTANTS
// ============================================

const TRAINING_STATUS_COLORS: Record<TrainingStatus, string> = {
  planned: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<TrainingStatus, string> = {
  planned: 'מתוכנן',
  completed: 'הושלם',
  draft: 'טיוטה',
  cancelled: 'בוטל',
};

// ============================================
// COMPONENT
// ============================================

export function GroupDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth(); // Ensure authenticated

  // State
  const [group, setGroup] = useState<Group | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch group
        const groupData = await groupsService.getById(id);

        if (!groupData) {
          setError('הקבוצה לא נמצאה');
          return;
        }

        setGroup(groupData);

        // Fetch trainings for this group
        const trainingsData = await trainingsService.getByGroup(id);

        // Filter to last 6 months
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 6);
        const filteredTrainings = trainingsData.filter(
          t => t.date.toDate() >= sixMonthsAgo && t.date.toDate() <= now
        );

        setTrainings(filteredTrainings);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('שגיאה בטעינת הקבוצה');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Stats
  const stats = useMemo(() => {
    if (!trainings.length) return null;

    const completed = trainings.filter(t => t.status === 'completed').length;
    const planned = trainings.filter(t => t.status === 'planned').length;
    const cancelled = trainings.filter(t => t.status === 'cancelled').length;
    const total = trainings.length;

    // Group by month
    const byMonth: Record<string, number> = {};
    trainings.forEach(t => {
      const month = format(t.date.toDate(), 'yyyy-MM');
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    return {
      total,
      completed,
      planned,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgPerMonth: Object.keys(byMonth).length > 0
        ? Math.round(total / Object.keys(byMonth).length)
        : 0,
    };
  }, [trainings]);

  // Upcoming trainings
  const upcomingTrainings = useMemo(() => {
    return trainings
      .filter(t => t.status === 'planned' && t.date.toDate() >= new Date())
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())
      .slice(0, 5);
  }, [trainings]);

  // Recent trainings
  const recentTrainings = useMemo(() => {
    return trainings
      .filter(t => t.date.toDate() < new Date())
      .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())
      .slice(0, 5);
  }, [trainings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-2xl shadow-card text-center py-16">
          <div className="text-5xl mb-4">😕</div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            {error || 'הקבוצה לא נמצאה'}
          </h3>
          <Link
            to="/coach/groups"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowRight size={20} />
            חזרה לקבוצות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowRight size={24} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{group.name}</h1>
          <p className="text-slate-500">
            שנתונים {group.birthYearLow}-{group.birthYearHigh}
          </p>
        </div>
        <Link
          to={`/coach/trainings/new?group=${group.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">אימון חדש</span>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-100">
                <CalendarBlank size={20} className="text-primary-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                <div className="text-sm text-slate-500">סה״כ אימונים</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-100">
                <TrendUp size={20} className="text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
                <div className="text-sm text-slate-500">אחוז השלמה</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <ChartBar size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.avgPerMonth}</div>
                <div className="text-sm text-slate-500">ממוצע לחודש</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100">
                <Clock size={20} className="text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.planned}</div>
                <div className="text-sm text-slate-500">מתוכננים</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Trainings */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">אימונים קרובים</h2>
            <Link
              to={`/coach/trainings?group=${group.id}`}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              הכל
            </Link>
          </div>

          {upcomingTrainings.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <p>אין אימונים מתוכננים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTrainings.map(training => (
                <TrainingItem key={training.id} training={training} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Trainings */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">אימונים אחרונים</h2>
          </div>

          {recentTrainings.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <p>אין אימונים קודמים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTrainings.map(training => (
                <TrainingItem key={training.id} training={training} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coach History */}
      {group.coachHistory && group.coachHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">היסטוריית מאמנים</h2>
          </div>

          <div className="space-y-3">
            {group.coachHistory
              .sort((a, b) => b.fromDate.toDate().getTime() - a.fromDate.toDate().getTime())
              .map((entry, index) => (
                <CoachHistoryItem
                  key={`${entry.coachId}-${index}`}
                  entry={entry}
                  isCurrent={!entry.toDate}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface TrainingItemProps {
  training: Training;
}

function TrainingItem({ training }: TrainingItemProps) {
  return (
    <Link
      to={`/coach/trainings/${training.id}`}
      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="font-medium text-slate-800">
            {format(training.date.toDate(), 'EEEE, d/M', { locale: he })}
          </div>
          <div className="text-slate-500">
            {training.startTime} - {training.endTime}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={clsx(
          'px-2.5 py-1 rounded-full text-xs font-medium border',
          TRAINING_STATUS_COLORS[training.status]
        )}>
          {STATUS_LABELS[training.status]}
        </span>
        <CaretLeft size={16} className="text-slate-300" />
      </div>
    </Link>
  );
}

interface CoachHistoryItemProps {
  entry: CoachHistoryEntry;
  isCurrent: boolean;
}

function CoachHistoryItem({ entry, isCurrent }: CoachHistoryItemProps) {
  return (
    <div className={clsx(
      'flex items-center justify-between p-4 rounded-xl',
      isCurrent ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50'
    )}>
      <div className="flex items-center gap-3">
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
          isCurrent ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-600'
        )}>
          {entry.coachName.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-slate-800">
            {entry.coachName}
            {isCurrent && (
              <span className="mr-2 text-xs text-primary-600">(נוכחי)</span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {format(entry.fromDate.toDate(), 'dd/MM/yyyy')}
            {entry.toDate && ` - ${format(entry.toDate.toDate(), 'dd/MM/yyyy')}`}
            {!entry.toDate && ' - היום'}
          </div>
        </div>
      </div>
    </div>
  );
}
