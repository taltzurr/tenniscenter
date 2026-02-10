/**
 * Exercises Page
 * Browse and filter exercise library
 */

import { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlass,
  FunnelSimple,
  Clock,
  Target,
  CaretDown,
  X,
  Plus,
  VideoCamera,
  Star,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

import { useAuth } from '@/contexts/AuthContext';
import { exercisesService } from '@/services/exercises.service';
import { Spinner } from '@/components/ui/Spinner';
import type { Exercise, SkillLevel, GameState, ExerciseTopic } from '@/types';

// ============================================
// CONSTANTS
// ============================================

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'מתחילים',
  intermediate: 'מתקדמים',
  advanced: 'מקצוענים',
};

const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const GAME_STATE_LABELS: Record<GameState, string> = {
  serving: 'מגיש',
  returning: 'מחזיר',
  both_baseline: 'שניים מאחור',
  approaching: 'מתקרב',
  passing: 'מעביר',
  match_play: 'משחק אימון',
};

const TOPIC_LABELS: Record<ExerciseTopic, string> = {
  opportunity_center: 'מרכז אפשרויות',
  match_play: 'משחק אימון',
  direction: 'כיוון',
  stability: 'יציבות',
  depth: 'עומק',
  height: 'גובה',
  clearance_search: 'חיפוש פינוי',
  agility: 'זריזות',
};

// ============================================
// COMPONENT
// ============================================

export function ExercisesPage() {
  const { user } = useAuth();

  // State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Filters
  const [skillFilter, setSkillFilter] = useState<SkillLevel | 'all'>('all');
  const [gameStateFilter, setGameStateFilter] = useState<GameState | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<ExerciseTopic | 'all'>('all');
  const [showPrivateOnly, setShowPrivateOnly] = useState(false);

  // Fetch exercises
  useEffect(() => {
    const fetchExercises = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const data = await exercisesService.getExercisesForCoach(user.id);
        setExercises(data);
      } catch (error) {
        console.error('Error fetching exercises:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExercises();
  }, [user]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = exercise.name.toLowerCase().includes(query);
        const matchesDesc = exercise.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Skill level
      if (skillFilter !== 'all' && !exercise.skillLevels.includes(skillFilter)) {
        return false;
      }

      // Game state
      if (gameStateFilter !== 'all' && !exercise.gameStates.includes(gameStateFilter)) {
        return false;
      }

      // Topic
      if (topicFilter !== 'all' && !exercise.topics.includes(topicFilter)) {
        return false;
      }

      // Private only
      if (showPrivateOnly && exercise.isGlobal) {
        return false;
      }

      return true;
    });
  }, [exercises, searchQuery, skillFilter, gameStateFilter, topicFilter, showPrivateOnly]);

  // Stats
  const stats = useMemo(() => ({
    total: exercises.length,
    global: exercises.filter(e => e.isGlobal).length,
    private: exercises.filter(e => !e.isGlobal).length,
    withVideo: exercises.filter(e => e.videoUrl).length,
  }), [exercises]);

  // Clear filters
  const clearFilters = () => {
    setSkillFilter('all');
    setGameStateFilter('all');
    setTopicFilter('all');
    setShowPrivateOnly(false);
  };

  const hasActiveFilters = skillFilter !== 'all' || gameStateFilter !== 'all' || topicFilter !== 'all' || showPrivateOnly;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ספריית תרגילים</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.total} תרגילים | {stats.global} גלובליים | {stats.private} פרטיים
          </p>
        </div>

        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Plus weight="bold" size={20} />
          <span className="hidden sm:inline">בקש תרגיל חדש</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-2xl shadow-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="חיפוש תרגיל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <FunnelSimple size={18} />
            <span>סינון</span>
            {hasActiveFilters && (
              <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {[skillFilter !== 'all', gameStateFilter !== 'all', topicFilter !== 'all', showPrivateOnly].filter(Boolean).length}
              </span>
            )}
            <CaretDown size={16} className={clsx('transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Skill Level */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  רמת מיומנות
                </label>
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value as SkillLevel | 'all')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="all">הכל</option>
                  {Object.entries(SKILL_LEVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Game State */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  מצב משחק
                </label>
                <select
                  value={gameStateFilter}
                  onChange={(e) => setGameStateFilter(e.target.value as GameState | 'all')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="all">הכל</option>
                  {Object.entries(GAME_STATE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  נושא
                </label>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value as ExerciseTopic | 'all')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="all">הכל</option>
                  {Object.entries(TOPIC_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Private Only Toggle */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrivateOnly}
                    onChange={(e) => setShowPrivateOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-600">תרגילים פרטיים בלבד</span>
                </label>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                נקה סינונים
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {filteredExercises.length === 0 ? (
        <EmptyState hasExercises={exercises.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map(exercise => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => setSelectedExercise(exercise)}
            />
          ))}
        </div>
      )}

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface ExerciseCardProps {
  exercise: Exercise;
  onClick: () => void;
}

function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-card p-5 text-right hover:shadow-md transition-all duration-200 w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-800 line-clamp-1">{exercise.name}</h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {exercise.videoUrl && (
            <VideoCamera size={16} className="text-primary-500" />
          )}
          {!exercise.isGlobal && (
            <Star size={16} weight="fill" className="text-amber-500" />
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
        {exercise.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {exercise.skillLevels.slice(0, 2).map(level => (
          <span
            key={level}
            className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', SKILL_LEVEL_COLORS[level])}
          >
            {SKILL_LEVEL_LABELS[level]}
          </span>
        ))}
        {exercise.skillLevels.length > 2 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            +{exercise.skillLevels.length - 2}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1 text-slate-500 text-sm">
          <Clock size={14} />
          <span>{exercise.duration} דק׳</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm">
          <Target size={14} />
          <span>{exercise.topics.length} נושאים</span>
        </div>
      </div>
    </button>
  );
}

interface ExerciseModalProps {
  exercise: Exercise;
  onClose: () => void;
}

function ExerciseModal({ exercise, onClose }: ExerciseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{exercise.name}</h2>
              {!exercise.isGlobal && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  <Star size={12} weight="fill" />
                  פרטי
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock size={16} />
              <span>{exercise.duration} דקות</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Video */}
          {exercise.videoUrl && (
            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
              <video
                src={exercise.videoUrl}
                controls
                className="w-full h-full object-cover"
                poster={exercise.videoUrl.replace(/\.[^/.]+$/, '_thumb.jpg')}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">תיאור</h3>
            <p className="text-slate-600 whitespace-pre-line">{exercise.description}</p>
          </div>

          {/* Skill Levels */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">רמות מיומנות</h3>
            <div className="flex flex-wrap gap-2">
              {exercise.skillLevels.map(level => (
                <span
                  key={level}
                  className={clsx('px-3 py-1 rounded-full text-sm font-medium', SKILL_LEVEL_COLORS[level])}
                >
                  {SKILL_LEVEL_LABELS[level]}
                </span>
              ))}
            </div>
          </div>

          {/* Game States */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">מצבי משחק</h3>
            <div className="flex flex-wrap gap-2">
              {exercise.gameStates.map(state => (
                <span
                  key={state}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700"
                >
                  {GAME_STATE_LABELS[state]}
                </span>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">נושאים</h3>
            <div className="flex flex-wrap gap-2">
              {exercise.topics.map(topic => (
                <span
                  key={topic}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700"
                >
                  {TOPIC_LABELS[topic]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasExercises: boolean;
}

function EmptyState({ hasExercises }: EmptyStateProps) {
  if (hasExercises) {
    return (
      <div className="bg-white rounded-2xl shadow-card text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">
          לא נמצאו תרגילים
        </h3>
        <p className="text-slate-500">
          נסה לשנות את הסינונים או מילות החיפוש
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card text-center py-16">
      <div className="text-5xl mb-4">🎾</div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">
        ספריית התרגילים ריקה
      </h3>
      <p className="text-slate-500 mb-6">
        תרגילים יתווספו על ידי המנהל המקצועי
      </p>
    </div>
  );
}
