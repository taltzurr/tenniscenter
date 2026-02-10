/**
 * Monthly Plan Page
 * Coach's monthly training plan management
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  PaperPlaneTilt,
  Warning,
  ListChecks,
  Eye,
  Plus,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

import { useAuth } from '@/contexts/AuthContext';
import { monthlyPlansService } from '@/services/monthly-plans.service';
import { trainingsService } from '@/services/trainings.service';
import { groupsService } from '@/services/groups.service';
import { Spinner } from '@/components/ui/Spinner';
import type { MonthlyPlan, Training, Group, TrainingStatus } from '@/types';

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<MonthlyPlan['status'], { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  draft: { label: 'טיוטה', bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock },
  submitted: { label: 'הוגש', bg: 'bg-blue-100', text: 'text-blue-700', icon: PaperPlaneTilt },
  reviewed: { label: 'נבדק', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
};

const TRAINING_STATUS_COLORS: Record<TrainingStatus, string> = {
  planned: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  draft: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};

// ============================================
// COMPONENT
// ============================================

export function MonthlyPlanPage() {
  const { user } = useAuth();

  // State
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse month for display
  const monthDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);

  // Navigate months
  const goToPreviousMonth = () => {
    const prev = subMonths(monthDate, 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const goToNextMonth = () => {
    const next = addMonths(monthDate, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch groups first
        const groupsData = await groupsService.getGroupsByCoach(user.id);
        setGroups(groupsData);

        // Fetch trainings for the month
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);
        const trainingsData = await trainingsService.getByCoachAndDateRange(user.id, {
          startDate,
          endDate,
        });
        setTrainings(trainingsData);

        // Fetch or create plan
        let planData = await monthlyPlansService.getByCoachAndMonth(user.id, selectedMonth);

        if (!planData && groupsData.length > 0) {
          // Create a new draft plan
          planData = await monthlyPlansService.createOrUpdatePlan({
            coachId: user.id,
            coachName: user.displayName,
            centerId: groupsData[0].centerId,
            centerName: 'מרכז הטניס', // TODO: Get from center
            month: selectedMonth,
          });
        }

        setPlan(planData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('שגיאה בטעינת התוכנית');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, selectedMonth, monthDate]);

  // Stats
  const stats = useMemo(() => {
    const byStatus = {
      planned: trainings.filter(t => t.status === 'planned').length,
      completed: trainings.filter(t => t.status === 'completed').length,
      cancelled: trainings.filter(t => t.status === 'cancelled').length,
      draft: trainings.filter(t => t.status === 'draft').length,
    };

    const byGroup: Record<string, number> = {};
    trainings.forEach(t => {
      byGroup[t.groupId] = (byGroup[t.groupId] || 0) + 1;
    });

    return { byStatus, byGroup, total: trainings.length };
  }, [trainings]);

  // Submit plan
  const handleSubmit = async () => {
    if (!plan) return;

    if (trainings.length === 0) {
      setError('לא ניתן להגיש תוכנית ללא אימונים');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedPlan = await monthlyPlansService.submitPlan(plan.id);
      setPlan(updatedPlan);
    } catch (err) {
      console.error('Error submitting plan:', err);
      setError('שגיאה בהגשת התוכנית');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current month or future
  const isCurrentOrFuture = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    return selectedMonth >= currentMonth;
  }, [selectedMonth]);

  const canSubmit = plan?.status === 'draft' && trainings.length > 0 && isCurrentOrFuture;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">תוכנית חודשית</h1>
          <p className="text-slate-500 text-sm mt-1">
            תכנון והגשת אימונים לחודש
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <CaretRight size={20} className="text-slate-600" />
          </button>

          <button
            onClick={goToCurrentMonth}
            className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 font-medium text-slate-800 min-w-[160px]"
          >
            {format(monthDate, 'MMMM yyyy', { locale: he })}
          </button>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <CaretLeft size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <Warning size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Plan Status Card */}
      {plan && (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <div className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                STATUS_CONFIG[plan.status].bg,
                STATUS_CONFIG[plan.status].text
              )}>
                {(() => {
                  const StatusIcon = STATUS_CONFIG[plan.status].icon;
                  return <StatusIcon size={20} weight="fill" />;
                })()}
                <span className="font-medium">{STATUS_CONFIG[plan.status].label}</span>
              </div>

              {/* Submission Date */}
              {plan.submittedAt && (
                <span className="text-sm text-slate-500">
                  הוגש ב-{format(plan.submittedAt.toDate(), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
            </div>

            {/* Submit Button */}
            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Spinner size="sm" /> : <PaperPlaneTilt size={20} />}
                <span>הגש תוכנית</span>
              </button>
            )}

            {plan.status === 'submitted' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl">
                <Eye size={20} />
                <span className="text-sm font-medium">ממתין לבדיקה</span>
              </div>
            )}

            {plan.status === 'reviewed' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl">
                <CheckCircle size={20} weight="fill" />
                <span className="text-sm font-medium">התוכנית אושרה</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-500">סה״כ אימונים</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.byStatus.planned}</div>
          <div className="text-sm text-slate-500">מתוכננים</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.byStatus.completed}</div>
          <div className="text-sm text-slate-500">הושלמו</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{stats.byStatus.cancelled}</div>
          <div className="text-sm text-slate-500">בוטלו</div>
        </div>
      </div>

      {/* Trainings by Group */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListChecks size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">אימונים לפי קבוצה</h2>
          </div>
          <Link
            to={`/coach/trainings/new?date=${selectedMonth}-01`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            <span>הוסף אימון</span>
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>אין קבוצות מוקצות</p>
          </div>
        ) : trainings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              אין אימונים לחודש זה
            </h3>
            <p className="text-slate-500 mb-4">
              הוסף אימונים כדי לבנות את התוכנית החודשית
            </p>
            <Link
              to={`/coach/trainings/new?date=${selectedMonth}-01`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus size={20} />
              <span>צור אימון חדש</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => {
              const groupTrainings = trainings
                .filter(t => t.groupId === group.id)
                .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

              if (groupTrainings.length === 0) return null;

              return (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-slate-800">
                      {group.name}
                      <span className="text-slate-400 font-normal mr-2">
                        ({groupTrainings.length} אימונים)
                      </span>
                    </h3>
                    <Link
                      to={`/coach/groups/${group.id}`}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      צפה בקבוצה
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {groupTrainings.map(training => (
                      <Link
                        key={training.id}
                        to={`/coach/trainings/${training.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarBlank size={16} />
                            <span>{format(training.date.toDate(), 'dd/MM')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock size={16} />
                            <span>{training.startTime} - {training.endTime}</span>
                          </div>
                        </div>

                        <span className={clsx(
                          'px-2.5 py-1 rounded-full text-xs font-medium',
                          TRAINING_STATUS_COLORS[training.status]
                        )}>
                          {training.status === 'planned' && 'מתוכנן'}
                          {training.status === 'completed' && 'הושלם'}
                          {training.status === 'cancelled' && 'בוטל'}
                          {training.status === 'draft' && 'טיוטה'}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submission Guidelines */}
      {plan?.status === 'draft' && isCurrentOrFuture && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Warning size={20} className="text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">לפני ההגשה</h4>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                <li>• ודא שכל האימונים לחודש נוספו</li>
                <li>• בדוק שהשעות והתאריכים נכונים</li>
                <li>• לאחר ההגשה לא ניתן לערוך את התוכנית</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
