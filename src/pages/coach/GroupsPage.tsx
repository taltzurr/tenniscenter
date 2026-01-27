/**
 * Groups Page
 * Shows coach's training groups with stats
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Users,
  CalendarBlank,
  TrendUp,
  CaretLeft,
  MagnifyingGlass,
  SortAscending,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { groupsService } from '@/services/groups.service';
import { trainingsService } from '@/services/trainings.service';
import { Spinner } from '@/components/ui/Spinner';
import type { Group } from '@/types';

// ============================================
// TYPES
// ============================================

type SortOption = 'name' | 'trainings' | 'recent';

interface GroupWithStats extends Group {
  totalTrainings: number;
  completedTrainings: number;
  lastTrainingDate?: Date;
}

// ============================================
// CONSTANTS
// ============================================

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'שם' },
  { value: 'trainings', label: 'מספר אימונים' },
  { value: 'recent', label: 'פעילות אחרונה' },
];

// ============================================
// COMPONENT
// ============================================

export function GroupsPage() {
  const { user } = useAuth();

  // State
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch groups
        const groupsData = await groupsService.getGroupsByCoach(user.id);

        // Fetch trainings for stats (last 3 months)
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const trainingsData = await trainingsService.getByCoachAndDateRange(user.id, {
          startDate: threeMonthsAgo,
          endDate: now,
        });

        // Calculate stats per group
        const groupsWithStats: GroupWithStats[] = groupsData.map(group => {
          const groupTrainings = trainingsData.filter(t => t.groupId === group.id);
          const completedTrainings = groupTrainings.filter(t => t.status === 'completed');

          // Find last training date
          const sortedTrainings = [...groupTrainings].sort(
            (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
          );
          const lastTraining = sortedTrainings[0];

          return {
            ...group,
            totalTrainings: groupTrainings.length,
            completedTrainings: completedTrainings.length,
            lastTrainingDate: lastTraining?.date.toDate(),
          };
        });

        setGroups(groupsWithStats);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(group =>
        group.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'he');
        case 'trainings':
          return b.totalTrainings - a.totalTrainings;
        case 'recent':
          const aDate = a.lastTrainingDate?.getTime() || 0;
          const bDate = b.lastTrainingDate?.getTime() || 0;
          return bDate - aDate;
        default:
          return 0;
      }
    });

    return result;
  }, [groups, searchQuery, sortBy]);

  // Stats
  const totalStats = useMemo(() => ({
    groups: groups.length,
    trainings: groups.reduce((sum, g) => sum + g.totalTrainings, 0),
    completed: groups.reduce((sum, g) => sum + g.completedTrainings, 0),
  }), [groups]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">הקבוצות שלי</h1>
        <p className="text-slate-500 text-sm mt-1">
          {totalStats.groups} קבוצות | {totalStats.trainings} אימונים ב-3 חודשים אחרונים
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-600 mb-2">
            <Users size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalStats.groups}</div>
          <div className="text-sm text-slate-500">קבוצות</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 mb-2">
            <CalendarBlank size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalStats.trainings}</div>
          <div className="text-sm text-slate-500">אימונים</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 text-green-600 mb-2">
            <TrendUp size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalStats.completed}</div>
          <div className="text-sm text-slate-500">הושלמו</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="חיפוש קבוצה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAscending size={18} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <EmptyState hasGroups={groups.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface GroupCardProps {
  group: GroupWithStats;
}

function GroupCard({ group }: GroupCardProps) {
  const completionRate = group.totalTrainings > 0
    ? Math.round((group.completedTrainings / group.totalTrainings) * 100)
    : 0;

  return (
    <Link
      to={`/coach/groups/${group.id}`}
      className="bg-white rounded-2xl shadow-card p-5 hover:shadow-md transition-all duration-200 block"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-slate-800">{group.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            שנתונים {group.birthYearLow}-{group.birthYearHigh}
          </p>
        </div>
        <CaretLeft size={20} className="text-slate-300 mt-1" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xl font-bold text-slate-800">{group.totalTrainings}</div>
          <div className="text-xs text-slate-500">אימונים</div>
        </div>
        <div>
          <div className="text-xl font-bold text-green-600">{group.completedTrainings}</div>
          <div className="text-xs text-slate-500">הושלמו</div>
        </div>
        <div>
          <div className="text-xl font-bold text-primary-600">{completionRate}%</div>
          <div className="text-xs text-slate-500">השלמה</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-l from-green-500 to-green-400 rounded-full transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Last Training */}
      {group.lastTrainingDate && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarBlank size={16} />
          <span>
            אימון אחרון: {format(group.lastTrainingDate, 'd בMMMM yyyy', { locale: he })}
          </span>
        </div>
      )}
    </Link>
  );
}

interface EmptyStateProps {
  hasGroups: boolean;
}

function EmptyState({ hasGroups }: EmptyStateProps) {
  if (hasGroups) {
    return (
      <div className="bg-white rounded-2xl shadow-card text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">
          לא נמצאו קבוצות
        </h3>
        <p className="text-slate-500">
          נסה לשנות את מילות החיפוש
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card text-center py-16">
      <div className="text-5xl mb-4">👥</div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">
        אין לך קבוצות עדיין
      </h3>
      <p className="text-slate-500 mb-6">
        פנה למנהל המרכז כדי להוסיף קבוצות
      </p>
    </div>
  );
}
