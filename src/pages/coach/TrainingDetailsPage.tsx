/**
 * Training Details Page
 * View complete training details with exercises
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  Users,
  Target,
  PencilSimple,
  CheckCircle,
  XCircle,
  ListNumbers,
  Warning,
  Play,
  Trash,
  Repeat,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

import { useAuth } from '@/contexts/AuthContext';
import { trainingsService } from '@/services/trainings.service';
import { exercisesService } from '@/services/exercises.service';
import { Spinner } from '@/components/ui/Spinner';
import type {
  Training,
  TrainingStatus,
  PeriodType,
  GameState,
  GameComponent,
  Exercise,
} from '@/types';

// ============================================
// CONSTANTS
// ============================================

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  general_preparation: 'הכנה כללית',
  specific_preparation: 'הכנה ספציפית',
  competition: 'תחרות',
  transition: 'תקופת מעבר',
  reinforcement: 'אימון תגבור',
  periodic_tests: 'מבדקים',
};

const GAME_STATE_LABELS: Record<GameState, string> = {
  serving: 'שחקן מגיש',
  returning: 'שחקן מחזיר',
  both_baseline: 'שניים מאחור',
  approaching: 'שחקן מתקרב',
  passing: 'שחקן מעביר',
  match_play: 'משחקי אימון',
};

const GAME_COMPONENT_LABELS: Record<GameComponent, string> = {
  technical: 'טכני',
  tactical: 'טקטי',
};

const STATUS_CONFIG: Record<TrainingStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  planned: { label: 'מתוכנן', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  completed: { label: 'הושלם', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  draft: { label: 'טיוטה', bg: 'bg-slate-50', text: 'text-slate-600', icon: CalendarBlank },
  cancelled: { label: 'בוטל', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
};

// ============================================
// COMPONENT
// ============================================

export function TrainingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated

  // State
  const [training, setTraining] = useState<Training | null>(null);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const trainingData = await trainingsService.getById(id);

        if (!trainingData) {
          setError('האימון לא נמצא');
          return;
        }

        setTraining(trainingData);

        // Fetch exercise details if training has exercises
        if (trainingData.exercises.length > 0) {
          const exerciseIds = trainingData.exercises.map(e => e.exerciseId);
          const exerciseMap = new Map<string, Exercise>();

          // Fetch each exercise
          await Promise.all(
            exerciseIds.map(async (exerciseId) => {
              const exercise = await exercisesService.getById(exerciseId);
              if (exercise) {
                exerciseMap.set(exerciseId, exercise);
              }
            })
          );

          setExercises(exerciseMap);
        }
      } catch (err) {
        console.error('Error fetching training:', err);
        setError('שגיאה בטעינת האימון');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Actions
  const handleMarkComplete = async () => {
    if (!training) return;

    setActionLoading(true);
    try {
      await trainingsService.markCompleted(training.id);
      setTraining({ ...training, status: 'completed' });
    } catch (err) {
      console.error('Error marking complete:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!training || !window.confirm('האם אתה בטוח שברצונך לבטל את האימון?')) return;

    setActionLoading(true);
    try {
      await trainingsService.cancelTraining(training.id);
      setTraining({ ...training, status: 'cancelled' });
    } catch (err) {
      console.error('Error cancelling:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!training || !window.confirm('האם אתה בטוח שברצונך למחוק את האימון? פעולה זו אינה ניתנת לביטול.')) return;

    setActionLoading(true);
    try {
      await trainingsService.delete(training.id);
      navigate('/coach/trainings');
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-2xl shadow-card text-center py-16">
          <div className="text-5xl mb-4">😕</div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            {error || 'האימון לא נמצא'}
          </h3>
          <Link
            to="/coach/trainings"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowRight size={20} />
            חזרה לרשימת האימונים
          </Link>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[training.status];
  const StatusIcon = config.icon;
  const trainingDate = training.date.toDate();
  const isPast = trainingDate < new Date() && training.status === 'planned';
  const canComplete = training.status === 'planned';
  const canCancel = training.status === 'planned';
  const canEdit = training.status === 'planned' || training.status === 'draft';

  // Calculate total duration
  const totalDuration = training.exercises.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowRight size={24} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{training.groupName}</h1>
            {training.isRecurring && (
              <span title="אימון חוזר">
                <Repeat size={20} className="text-slate-400" />
              </span>
            )}
          </div>
          <p className="text-slate-500">
            {format(trainingDate, 'EEEE, d בMMMM yyyy', { locale: he })}
          </p>
        </div>

        {/* Status Badge */}
        <div className={clsx('inline-flex items-center gap-2 px-4 py-2 rounded-xl', config.bg, config.text)}>
          <StatusIcon size={20} weight="fill" />
          <span className="font-medium">{config.label}</span>
        </div>
      </div>

      {/* Past Training Warning */}
      {isPast && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-700">
          <Warning size={20} />
          <span>האימון עבר ולא סומן כהושלם</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <CalendarBlank size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">תאריך</p>
              <p className="font-medium text-slate-800">
                {format(trainingDate, 'dd/MM/yyyy')}
              </p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Clock size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">שעות</p>
              <p className="font-medium text-slate-800">
                {training.startTime} - {training.endTime}
              </p>
            </div>
          </div>

          {/* Period Type */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Target size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">תקופה</p>
              <p className="font-medium text-slate-800">
                {PERIOD_TYPE_LABELS[training.periodType]}
              </p>
            </div>
          </div>

          {/* Game State */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Users size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">מצב משחק</p>
              <p className="font-medium text-slate-800">
                {GAME_STATE_LABELS[training.gameState]}
              </p>
            </div>
          </div>
        </div>

        {/* Topics & Component */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-sm text-slate-500 ml-2">מרכיב:</span>
              <span className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                training.gameComponent === 'technical' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
              )}>
                {GAME_COMPONENT_LABELS[training.gameComponent]}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">נושאים:</span>
              {training.topics.map(topic => (
                <span key={topic} className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Details */}
        {training.details && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-2">הערות</h3>
            <p className="text-slate-600 whitespace-pre-line">{training.details}</p>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListNumbers size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">
              תרגילים ({training.exercises.length})
            </h2>
          </div>
          {totalDuration > 0 && (
            <span className="text-sm text-slate-500">
              סה״כ: {totalDuration} דקות
            </span>
          )}
        </div>

        {training.exercises.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>לא נוספו תרגילים לאימון זה</p>
            {canEdit && (
              <Link
                to={`/coach/trainings/${training.id}/edit`}
                className="text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block"
              >
                הוסף תרגילים
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {training.exercises
              .sort((a, b) => a.order - b.order)
              .map((trainingExercise, index) => {
                const exercise = exercises.get(trainingExercise.exerciseId);
                return (
                  <div
                    key={trainingExercise.exerciseId}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-800">
                        {trainingExercise.exerciseName}
                      </h4>
                      {exercise?.description && (
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {exercise.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {exercise?.videoUrl && (
                        <button className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-primary-600">
                          <Play size={18} />
                        </button>
                      )}
                      <span className="text-sm text-slate-500">
                        {trainingExercise.duration} דק׳
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Destructive Actions */}
          <div className="flex items-center gap-3">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              >
                <XCircle size={20} />
                <span>בטל אימון</span>
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash size={20} />
              <span>מחק</span>
            </button>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-3">
            {canEdit && (
              <Link
                to={`/coach/trainings/${training.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                <PencilSimple size={20} />
                <span>ערוך</span>
              </Link>
            )}
            {canComplete && (
              <button
                onClick={handleMarkComplete}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white hover:bg-green-600 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Spinner size="sm" /> : <CheckCircle size={20} />}
                <span>סמן כהושלם</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
