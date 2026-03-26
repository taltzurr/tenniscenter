/**
 * Utility functions for Center Manager Dashboard
 * These functions handle data filtering and calculations for center-specific views
 */
import { normalizeDate, formatHebrewTime, isSameDay } from '../../../utils/dateUtils';

/**
 * Filter coaches belonging to a specific center
 * @param {Array} users - All users in the system
 * @param {string} centerId - The center ID to filter by
 * @returns {Array} - Coaches belonging to the center
 */
export const getCenterCoaches = (users, centerId) => {
  if (!users || !centerId) return [];

  return users.filter(user =>
    user.role === 'coach' &&
    user.centerIds?.includes(centerId) &&
    user.isActive !== false
  );
};

/**
 * Calculate plan submission progress for a coach
 * @param {string} coachId - The coach's ID
 * @param {Array} groups - All groups
 * @param {Array} plans - All monthly plans
 * @param {number} currentYear - Current year
 * @param {number} currentMonth - Current month (1-12)
 * @returns {Object} - Progress data { total, submitted, percentage, isComplete }
 */
export const getCoachPlanProgress = (coachId, groups, plans, currentYear, currentMonth) => {
  const coachGroups = groups.filter(g => g.coachId === coachId && g.isActive !== false);
  const totalGroups = coachGroups.length;

  const submittedPlans = coachGroups.filter(group => {
    const plan = plans.find(p =>
      p.groupId === group.id &&
      p.year === currentYear &&
      p.month === currentMonth
    );
    // Consider submitted, approved, and reviewed as "submitted"
    return plan && ['submitted', 'approved', 'reviewed'].includes(plan.status);
  }).length;

  return {
    total: totalGroups,
    submitted: submittedPlans,
    percentage: totalGroups > 0 ? Math.round((submittedPlans / totalGroups) * 100) : 0,
    isComplete: totalGroups > 0 && submittedPlans === totalGroups
  };
};

/**
 * Calculate execution completion rate for a coach
 * Only counts PAST trainings (date <= today) for consistency with supervisor dashboard
 * @param {string} coachId - The coach's ID
 * @param {Array} trainings - All trainings
 * @returns {Object} - Execution data { total, completed, percentage }
 */
export const getCoachExecutionRate = (coachId, trainings) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const coachTrainings = trainings.filter(t => {
    if (t.coachId !== coachId) return false;
    const d = normalizeDate(t.date);
    return d && d <= today;
  });
  const total = coachTrainings.length;
  const completed = coachTrainings.filter(t => t.status === 'completed').length;

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

/**
 * Get today's trainings for center coaches
 * Filters to show only trainings/groups from this specific center
 * @param {Array} trainings - All trainings
 * @param {Array} centerGroups - Groups belonging to the center
 * @param {Array} users - All users
 * @returns {Array} - Today's trainings with enhanced data
 */
export const getTodaysTrainings = (trainings, centerGroups, users) => {
  const today = new Date();
  const centerGroupIds = centerGroups.map(g => g.id);

  return trainings
    .filter(t => {
      const belongsToCenter = centerGroupIds.includes(t.groupId);
      const trainingDate = normalizeDate(t.date);
      return belongsToCenter && isSameDay(trainingDate, today);
    })
    .map(training => {
      const coach = users.find(u => u.id === training.coachId);
      const group = centerGroups.find(g => g.id === training.groupId);

      return {
        ...training,
        coachName: coach?.displayName || 'מאמן',
        groupName: group?.name || training.groupName || 'קבוצה',
        time: formatHebrewTime(training.date)
      };
    })
    .sort((a, b) => {
      const dateA = normalizeDate(a.date);
      const dateB = normalizeDate(b.date);
      return (dateA || 0) - (dateB || 0);
    });
};

/**
 * Get the status badge color based on completion percentage
 * @param {number} percentage - Completion percentage
 * @returns {string} - Color class name
 */
export const getStatusColor = (percentage) => {
  if (percentage === 100) return 'success'; // Green
  if (percentage >= 50) return 'warning'; // Yellow
  return 'danger'; // Red
};

/**
 * Get the status text based on completion percentage
 * @param {number} percentage - Completion percentage
 * @returns {string} - Status text in Hebrew
 */
export const getStatusText = (percentage) => {
  if (percentage === 100) return 'הושלם';
  if (percentage >= 50) return 'בתהליך';
  return 'דרוש מעקב';
};
