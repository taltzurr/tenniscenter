/**
 * Training Form Page
 * Create or edit a training session
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  ArrowRight,
  CalendarBlank,
  Users,
  Target,
  GameController,
  ListBullets,
  FloppyDisk,
  Trash,
  Warning,
  CheckCircle,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { trainingsService } from '@/services/trainings.service';
import { groupsService } from '@/services/groups.service';
import { Spinner } from '@/components/ui/Spinner';
import type {
  Training,
  Group,
  PeriodType,
  GameState,
  GameComponent,
  CreateTrainingData,
} from '@/types';

// ============================================
// SCHEMA & TYPES
// ============================================

const trainingSchema = z.object({
  groupId: z.string().min(1, 'יש לבחור קבוצה'),
  date: z.string().min(1, 'יש לבחור תאריך'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'פורמט לא תקין'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'פורמט לא תקין'),
  periodType: z.enum([
    'general_preparation',
    'specific_preparation',
    'competition',
    'transition',
    'reinforcement',
    'periodic_tests',
  ]),
  gameState: z.enum([
    'serving',
    'returning',
    'both_baseline',
    'approaching',
    'passing',
    'match_play',
  ]),
  gameComponent: z.enum(['technical', 'tactical']),
  topics: z.array(z.string()).min(1, 'יש לבחור לפחות נושא אחד'),
  details: z.string().optional(),
}).refine(data => {
  const [startH, startM] = data.startTime.split(':').map(Number);
  const [endH, endM] = data.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return endMinutes > startMinutes;
}, {
  message: 'שעת סיום חייבת להיות אחרי שעת התחלה',
  path: ['endTime'],
});

type TrainingFormData = z.infer<typeof trainingSchema>;

// ============================================
// CONSTANTS
// ============================================

const PERIOD_TYPES: { value: PeriodType; label: string; description: string }[] = [
  { value: 'general_preparation', label: 'הכנה כללית', description: 'בניית בסיס פיזי וטכני' },
  { value: 'specific_preparation', label: 'הכנה ספציפית', description: 'עבודה ממוקדת על מיומנויות' },
  { value: 'competition', label: 'תחרות', description: 'הכנה למשחקים ותחרויות' },
  { value: 'transition', label: 'תקופת מעבר', description: 'התאוששות ומעבר בין תקופות' },
  { value: 'reinforcement', label: 'אימון תגבור', description: 'חיזוק מיומנויות קיימות' },
  { value: 'periodic_tests', label: 'מבדקים', description: 'בדיקת התקדמות' },
];

const GAME_STATES: { value: GameState; label: string }[] = [
  { value: 'serving', label: 'שחקן מגיש' },
  { value: 'returning', label: 'שחקן מחזיר' },
  { value: 'both_baseline', label: 'שניים מאחור' },
  { value: 'approaching', label: 'שחקן מתקרב' },
  { value: 'passing', label: 'שחקן מעביר' },
  { value: 'match_play', label: 'משחקי אימון' },
];

const GAME_COMPONENTS: { value: GameComponent; label: string }[] = [
  { value: 'technical', label: 'טכני' },
  { value: 'tactical', label: 'טקטי' },
];

const TOPICS = [
  'מרכז אפשרויות',
  'כיוון',
  'יציבות',
  'עומק',
  'גובה',
  'חיפוש פינוי',
  'זריזות',
  'משחק אימון',
];

// ============================================
// COMPONENT
// ============================================

export function TrainingFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isEdit = Boolean(id);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [training, setTraining] = useState<Training | null>(null);
  const [conflicts, setConflicts] = useState<Training[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get default values from URL params (for creating from calendar)
  const defaultDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const defaultTime = searchParams.get('time') || '09:00';

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      groupId: '',
      date: defaultDate,
      startTime: defaultTime,
      endTime: '10:30',
      periodType: 'general_preparation',
      gameState: 'both_baseline',
      gameComponent: 'technical',
      topics: [],
      details: '',
    },
  });

  // Watch values for conflict checking
  const watchDate = watch('date');
  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');
  const watchGroupId = watch('groupId');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch groups
        const groupsData = await groupsService.getGroupsByCoach(user.id);
        setGroups(groupsData);

        // If editing, fetch training
        if (isEdit && id) {
          const trainingData = await trainingsService.getById(id);
          if (trainingData) {
            setTraining(trainingData);
            // Populate form
            setValue('groupId', trainingData.groupId);
            setValue('date', format(trainingData.date.toDate(), 'yyyy-MM-dd'));
            setValue('startTime', trainingData.startTime);
            setValue('endTime', trainingData.endTime);
            setValue('periodType', trainingData.periodType);
            setValue('gameState', trainingData.gameState);
            setValue('gameComponent', trainingData.gameComponent);
            setValue('topics', trainingData.topics);
            setValue('details', trainingData.details || '');
          } else {
            setError('האימון לא נמצא');
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('שגיאה בטעינת הנתונים');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, id, isEdit, setValue]);

  // Check for conflicts when date/time changes
  useEffect(() => {
    const checkConflicts = async () => {
      if (!user || !watchDate || !watchStartTime || !watchEndTime) return;

      try {
        const conflictTrainings = await trainingsService.checkConflicts(
          user.id,
          new Date(watchDate),
          watchStartTime,
          watchEndTime,
          id // Exclude current training if editing
        );
        setConflicts(conflictTrainings);
      } catch (err) {
        console.error('Error checking conflicts:', err);
      }
    };

    checkConflicts();
  }, [user, watchDate, watchStartTime, watchEndTime, id]);

  // Submit handler
  const onSubmit = async (data: TrainingFormData) => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      const selectedGroup = groups.find(g => g.id === data.groupId);
      if (!selectedGroup) {
        throw new Error('קבוצה לא נמצאה');
      }

      if (isEdit && id) {
        // Update existing training
        await trainingsService.update(id, {
          groupId: data.groupId,
          groupName: selectedGroup.name,
          date: Timestamp.fromDate(new Date(data.date)),
          startTime: data.startTime,
          endTime: data.endTime,
          periodType: data.periodType,
          gameState: data.gameState,
          gameComponent: data.gameComponent,
          topics: data.topics,
          details: data.details,
        });
      } else {
        // Create new training
        const trainingData: CreateTrainingData = {
          groupId: data.groupId,
          groupName: selectedGroup.name,
          coachId: user.id,
          coachName: user.displayName,
          centerId: selectedGroup.centerId,
          date: new Date(data.date),
          startTime: data.startTime,
          endTime: data.endTime,
          periodType: data.periodType,
          gameState: data.gameState,
          gameComponent: data.gameComponent,
          topics: data.topics,
          details: data.details,
          exercises: [],
        };
        await trainingsService.createTraining(trainingData);
      }

      navigate('/coach/trainings');
    } catch (err) {
      console.error('Error saving training:', err);
      setError('שגיאה בשמירת האימון');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!id || !window.confirm('האם אתה בטוח שברצונך למחוק את האימון?')) return;

    setIsDeleting(true);
    try {
      await trainingsService.delete(id);
      navigate('/coach/trainings');
    } catch (err) {
      console.error('Error deleting training:', err);
      setError('שגיאה במחיקת האימון');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowRight size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'עריכת אימון' : 'יצירת אימון חדש'}
          </h1>
          {training && (
            <p className="text-slate-500 text-sm mt-1">
              {training.groupName} | {format(training.date.toDate(), 'dd/MM/yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <Warning size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <Warning size={20} />
            <span>קיימים אימונים חופפים</span>
          </div>
          <ul className="text-sm text-amber-600 space-y-1">
            {conflicts.map(c => (
              <li key={c.id}>
                {c.groupName} | {c.startTime} - {c.endTime}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Group Selection */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">קבוצה</h2>
          </div>

          <select
            {...register('groupId')}
            className={clsx(
              'w-full px-4 py-3 rounded-xl border text-slate-800',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              errors.groupId ? 'border-red-300' : 'border-slate-200'
            )}
          >
            <option value="">בחר קבוצה...</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.birthYearLow}-{group.birthYearHigh})
              </option>
            ))}
          </select>
          {errors.groupId && (
            <p className="text-red-500 text-sm mt-1">{errors.groupId.message}</p>
          )}
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarBlank size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">תאריך ושעה</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                תאריך
              </label>
              <input
                type="date"
                {...register('date')}
                className={clsx(
                  'w-full px-4 py-3 rounded-xl border text-slate-800',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                  errors.date ? 'border-red-300' : 'border-slate-200'
                )}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                שעת התחלה
              </label>
              <input
                type="time"
                {...register('startTime')}
                className={clsx(
                  'w-full px-4 py-3 rounded-xl border text-slate-800',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                  errors.startTime ? 'border-red-300' : 'border-slate-200'
                )}
              />
              {errors.startTime && (
                <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                שעת סיום
              </label>
              <input
                type="time"
                {...register('endTime')}
                className={clsx(
                  'w-full px-4 py-3 rounded-xl border text-slate-800',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                  errors.endTime ? 'border-red-300' : 'border-slate-200'
                )}
              />
              {errors.endTime && (
                <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Training Type */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">סוג אימון</h2>
          </div>

          <div className="space-y-4">
            {/* Period Type */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                תקופת אימון
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PERIOD_TYPES.map(period => (
                  <label
                    key={period.value}
                    className={clsx(
                      'flex flex-col p-3 rounded-xl border cursor-pointer transition-all',
                      watchGroupId && watch('periodType') === period.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      {...register('periodType')}
                      value={period.value}
                      className="sr-only"
                    />
                    <span className="font-medium text-slate-800 text-sm">
                      {period.label}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {period.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Game State */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                מצב משחק
              </label>
              <div className="flex flex-wrap gap-2">
                {GAME_STATES.map(state => (
                  <label
                    key={state.value}
                    className={clsx(
                      'px-4 py-2 rounded-xl border cursor-pointer transition-all text-sm',
                      watch('gameState') === state.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <input
                      type="radio"
                      {...register('gameState')}
                      value={state.value}
                      className="sr-only"
                    />
                    {state.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Game Component */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                מרכיב משחק
              </label>
              <div className="flex gap-2">
                {GAME_COMPONENTS.map(component => (
                  <label
                    key={component.value}
                    className={clsx(
                      'flex-1 text-center px-4 py-3 rounded-xl border cursor-pointer transition-all',
                      watch('gameComponent') === component.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <input
                      type="radio"
                      {...register('gameComponent')}
                      value={component.value}
                      className="sr-only"
                    />
                    {component.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListBullets size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">נושאים</h2>
          </div>

          <Controller
            name="topics"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(topic => {
                  const isSelected = field.value.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          field.onChange(field.value.filter((t: string) => t !== topic));
                        } else {
                          field.onChange([...field.value, topic]);
                        }
                      }}
                      className={clsx(
                        'px-4 py-2 rounded-xl border transition-all text-sm',
                        isSelected
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      )}
                    >
                      {isSelected && <CheckCircle size={16} className="inline ml-1" weight="fill" />}
                      {topic}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.topics && (
            <p className="text-red-500 text-sm mt-2">{errors.topics.message}</p>
          )}
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <GameController size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800">פרטים נוספים</h2>
          </div>

          <textarea
            {...register('details')}
            rows={4}
            placeholder="הערות, מטרות מיוחדות, או כל מידע נוסף..."
            className={clsx(
              'w-full px-4 py-3 rounded-xl border text-slate-800 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              'border-slate-200'
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash size={20} />}
              <span>מחק אימון</span>
            </button>
          )}

          <div className="flex items-center gap-3 mr-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSaving || (!isDirty && isEdit)}
              className={clsx(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors',
                'bg-primary-500 text-white hover:bg-primary-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? <Spinner size="sm" /> : <FloppyDisk size={20} />}
              <span>{isEdit ? 'שמור שינויים' : 'צור אימון'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
