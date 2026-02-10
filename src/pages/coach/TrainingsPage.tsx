/**
 * Trainings Page
 * Shows list of trainings with filters and quick actions
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  isToday,
  isTomorrow,
  isPast,
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Plus,
  CalendarBlank,
  CheckCircle,
  XCircle,
  Clock,
  FunnelSimple,
  CaretLeft,
  MagnifyingGlass,
  ListBullets,
  CalendarDots,
  DotsThree,
  Repeat,
  Warning,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

import { useAuth } from '@/contexts/AuthContext';
import { trainingsService } from '@/services/trainings.service';
import { groupsService } from '@/services/groups.service';
import { Spinner } from '@/components/ui/Spinner';
import type { Training, TrainingStatus, Group, PeriodType, GameState } from '@/types';

// ============================================
// TYPES
// ============================================

type DateFilter = 'today' | 'week' | 'month' | 'all';
type StatusFilter = TrainingStatus | 'all';
type ViewMode = 'list' | 'timeline';

// ============================================
// CONSTANTS
// ============================================

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'היום' },
  { value: 'week', label: 'השבוע' },
  { value: 'month', label: 'החודש' },
  { value: 'all', label: 'הכל' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'הכל', color: 'slate' },
  { value: 'planned', label: 'מתוכננים', color: 'blue' },
  { value: 'completed', label: 'הושלמו', color: 'green' },
  { value: 'draft', label: 'טיוטות', color: 'slate' },
  { value: 'cancelled', label: 'בוטלו', color: 'red' },
];

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  general_preparation: 'הכנה כללית',
  specific_preparation: 'הכנה ספציפית',
  competition: 'תחרות',
  transition: 'תקופת מעבר',
  reinforcement: 'אימון תגבור',
  periodic_tests: 'מבדקים',
};

const GAME_STATE_LABELS: Record<GameState, string> = {
  serving: 'מגיש',
  returning: 'מחזיר',
  both_baseline: 'שניים מאחור',
  approaching: 'מתקרב',
  passing: 'מעביר',
  match_play: 'משחק',
};

const STATUS_CONFIG: Record<TrainingStatus, { bg: string; text: string; badge: string; icon: typeof CheckCircle }> = {
  planned: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'badge-info', icon: Clock },
  completed: { bg: 'bg-green-50', text: 'text-green-700', badge: 'badge-success', icon: CheckCircle },
  draft: { bg: 'bg-slate-50', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-600', icon: CalendarBlank },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700', icon: XCircle },
};

// ============================================
// COMPONENT
// ============================================

export function TrainingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters from URL params
  const dateFilter = (searchParams.get('date') as DateFilter) || 'week';
  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';
  const groupFilter = searchParams.get('group') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const viewMode = (searchParams.get('view') as ViewMode) || 'list';

  // Update URL params
  const updateFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      if (value === 'all' || value === '' || value === 'week') {
        prev.delete(key);
      } else {
        prev.set(key, value);
      }
      return prev;
    });
  }, [setSearchParams]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Calculate date range based on filter
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case 'week':
            startDate = startOfWeek(now, { weekStartsOn: 0 });
            endDate = endOfWeek(now, { weekStartsOn: 0 });
            break;
          case 'month':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          case 'all':
          default:
            // Fetch last 3 months and next 3 months
            startDate = addDays(now, -90);
            endDate = addDays(now, 90);
        }

        const [trainingsData, groupsData] = await Promise.all([
          trainingsService.getByCoachAndDateRange(user.id, { startDate, endDate }),
          groupsService.getGroupsByCoach(user.id),
        ]);

        setTrainings(trainingsData);
        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, dateFilter]);

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    return trainings.filter(training => {
      // Status filter
      if (statusFilter !== 'all' && training.status !== statusFilter) {
        return false;
      }

      // Group filter
      if (groupFilter !== 'all' && training.groupId !== groupFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesGroup = training.groupName.toLowerCase().includes(query);
        const matchesDetails = training.details?.toLowerCase().includes(query);
        if (!matchesGroup && !matchesDetails) {
          return false;
        }
      }

      return true;
    });
  }, [trainings, statusFilter, groupFilter, searchQuery]);

  // Group trainings by date for timeline view
  const groupedTrainings = useMemo(() => {
    const grouped: Record<string, Training[]> = {};

    filteredTrainings.forEach(training => {
      const dateKey = format(training.date.toDate(), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(training);
    });

    // Sort by time within each day
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return grouped;
  }, [filteredTrainings]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredTrainings.length,
    planned: filteredTrainings.filter(t => t.status === 'planned').length,
    completed: filteredTrainings.filter(t => t.status === 'completed').length,
    cancelled: filteredTrainings.filter(t => t.status === 'cancelled').length,
  }), [filteredTrainings]);

  // Actions
  const handleMarkComplete = async (trainingId: string) => {
    setActionLoading(trainingId);
    try {
      await trainingsService.markCompleted(trainingId);
      setTrainings(prev => prev.map(t =>
        t.id === trainingId ? { ...t, status: 'completed' as TrainingStatus } : t
      ));
    } catch (error) {
      console.error('Error marking training as complete:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (trainingId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך לבטל את האימון?')) return;

    setActionLoading(trainingId);
    try {
      await trainingsService.cancelTraining(trainingId);
      setTrainings(prev => prev.map(t =>
        t.id === trainingId ? { ...t, status: 'cancelled' as TrainingStatus } : t
      ));
    } catch (error) {
      console.error('Error cancelling training:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Get date label for display
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return 'היום';
    if (isTomorrow(date)) return 'מחר';
    return format(date, 'EEEE, d בMMMM', { locale: he });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">האימונים שלי</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.total} אימונים | {stats.planned} מתוכננים | {stats.completed} הושלמו
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => updateFilter('view', 'list')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'
              )}
              aria-label="תצוגת רשימה"
            >
              <ListBullets size={20} />
            </button>
            <button
              onClick={() => updateFilter('view', 'timeline')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                viewMode === 'timeline' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'
              )}
              aria-label="תצוגת ציר זמן"
            >
              <CalendarDots size={20} />
            </button>
          </div>

          {/* Add Training Button */}
          <Link
            to="/coach/trainings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors shadow-sm"
          >
            <Plus weight="bold" size={20} />
            <span className="hidden sm:inline">אימון חדש</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-card p-4 space-y-4">
        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {DATE_FILTERS.map(filter => (
            <button
              key={filter.value}
              onClick={() => updateFilter('date', filter.value)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                dateFilter === filter.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {filter.label}
            </button>
          ))}

          <div className="flex-1" />

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              showFilters ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <FunnelSimple size={18} />
            <span>סינון</span>
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {STATUS_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            {/* Group Filter */}
            <select
              value={groupFilter}
              onChange={(e) => updateFilter('group', e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="all">כל הקבוצות</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredTrainings.length === 0 ? (
        <EmptyState dateFilter={dateFilter} />
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredTrainings
            .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())
            .map(training => (
              <TrainingCard
                key={training.id}
                training={training}
                actionLoading={actionLoading}
                onMarkComplete={handleMarkComplete}
                onCancel={handleCancel}
              />
            ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTrainings)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, dayTrainings]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-semibold text-slate-500 mb-3 sticky top-0 bg-slate-50 py-2 -mx-4 px-4 lg:-mx-6 lg:px-6">
                  {getDateLabel(new Date(dateKey))}
                </h3>
                <div className="space-y-3">
                  {dayTrainings.map(training => (
                    <TrainingCard
                      key={training.id}
                      training={training}
                      actionLoading={actionLoading}
                      onMarkComplete={handleMarkComplete}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface TrainingCardProps {
  training: Training;
  actionLoading: string | null;
  onMarkComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

function TrainingCard({ training, actionLoading, onMarkComplete, onCancel }: TrainingCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const config = STATUS_CONFIG[training.status];
  const StatusIcon = config.icon;
  const trainingDate = training.date.toDate();
  const isPastTraining = isPast(trainingDate) && !isToday(trainingDate);
  const canComplete = training.status === 'planned' && (isPastTraining || isToday(trainingDate));
  const canCancel = training.status === 'planned';

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-card p-4 border-r-4 transition-all duration-200',
        'hover:shadow-md',
        training.status === 'completed' && 'border-r-green-500',
        training.status === 'planned' && 'border-r-blue-500',
        training.status === 'draft' && 'border-r-slate-300',
        training.status === 'cancelled' && 'border-r-red-400'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <Link to={`/coach/trainings/${training.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 truncate">
              {training.groupName}
            </h3>
            {training.isRecurring && (
              <span title="אימון חוזר">
                <Repeat size={16} className="text-slate-400 flex-shrink-0" />
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <CalendarBlank size={16} />
              {format(trainingDate, 'd/M/yy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {training.startTime} - {training.endTime}
            </span>
            <span className="text-slate-400">|</span>
            <span>{PERIOD_TYPE_LABELS[training.periodType]}</span>
            <span className="text-slate-400">|</span>
            <span>{GAME_STATE_LABELS[training.gameState]}</span>
          </div>

          {training.details && (
            <p className="text-sm text-slate-500 mt-2 line-clamp-1">
              {training.details}
            </p>
          )}
        </Link>

        {/* Right Side - Status & Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status Badge */}
          <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', config.badge)}>
            <StatusIcon size={14} weight="fill" />
            {STATUS_FILTERS.find(s => s.value === training.status)?.label}
          </span>

          {/* Quick Actions */}
          {(canComplete || canCancel) && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                disabled={actionLoading === training.id}
              >
                {actionLoading === training.id ? (
                  <Spinner size="sm" />
                ) : (
                  <DotsThree size={20} weight="bold" />
                )}
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 min-w-[140px]">
                    {canComplete && (
                      <button
                        onClick={() => {
                          onMarkComplete(training.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-right text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        סמן כהושלם
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => {
                          onCancel(training.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <XCircle size={18} />
                        בטל אימון
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <CaretLeft size={20} className="text-slate-300" />
        </div>
      </div>

      {/* Warning for past unfinished trainings */}
      {isPastTraining && training.status === 'planned' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-amber-600 text-sm">
          <Warning size={16} />
          <span>אימון עבר ולא סומן כהושלם</span>
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  dateFilter: DateFilter;
}

function EmptyState({ dateFilter }: EmptyStateProps) {
  const getMessage = () => {
    switch (dateFilter) {
      case 'today':
        return 'אין אימונים מתוכננים להיום';
      case 'week':
        return 'אין אימונים מתוכננים לשבוע זה';
      case 'month':
        return 'אין אימונים מתוכננים לחודש זה';
      default:
        return 'לא נמצאו אימונים';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card text-center py-16">
      <div className="text-5xl mb-4">🎾</div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">
        {getMessage()}
      </h3>
      <p className="text-slate-500 mb-6">
        זה הזמן המושלם ליצור אימונים חדשים!
      </p>
      <Link
        to="/coach/trainings/new"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors shadow-sm"
      >
        <Plus size={20} weight="bold" />
        <span>יצירת אימון חדש</span>
      </Link>
    </div>
  );
}
