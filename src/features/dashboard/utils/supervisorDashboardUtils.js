/**
 * Utility functions for Supervisor (Manager) Dashboard
 * Org-wide calculations across all centers
 *
 * IMPORTANT: All training counts use getValidGroupIds() which only includes
 * active groups that belong to a real center. This ensures org totals = sum of center totals.
 */
import { normalizeDate, isSameDay } from '../../../utils/dateUtils';

/**
 * Get all active coaches from all centers
 */
export const getAllCoaches = (users) => {
  if (!users) return [];
  return users.filter(u => u.role === 'coach' && u.isActive !== false);
};

/**
 * Get IDs of active groups that belong to a real center.
 * This is the SINGLE source of truth for filtering trainings - guarantees
 * org-wide total = sum of per-center totals (no orphan trainings).
 */
const getValidGroupIds = (groups, centers) => {
  const centerIds = new Set(centers.map(c => c.id));
  const validGroups = groups.filter(g => g.isActive !== false && centerIds.has(g.centerId));
  return new Set(validGroups.map(g => g.id));
};

/**
 * Resolve center name for a coach (first assigned center)
 */
export const getCoachCenterName = (coach, centers) => {
  if (!coach.centerIds?.length || !centers?.length) return null;
  const center = centers.find(c => c.id === coach.centerIds[0]);
  return center?.name || null;
};

/**
 * Calculate org-wide quick stats
 * Only counts trainings with past dates for completion rate
 */
export const getOrgQuickStats = (users, trainings, plans, groups, events, centers, currentYear, currentMonth) => {
  const coaches = getAllCoaches(users);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const validGroupIds = getValidGroupIds(groups, centers);
  const activeGroups = groups.filter(g => g.isActive !== false);

  // Today's trainings
  const todaysTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && isSameDay(d, new Date());
  });

  // Monthly completion rate - only past trainings belonging to valid groups
  const pastTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && d <= today && validGroupIds.has(t.groupId);
  });
  const completedTrainings = pastTrainings.filter(t => t.status === 'completed').length;
  const completionRate = pastTrainings.length > 0
    ? Math.round((completedTrainings / pastTrainings.length) * 100)
    : 0;

  // Plan submission
  let coachesWithAllPlans = 0;
  coaches.forEach(coach => {
    const coachGroups = activeGroups.filter(g => g.coachId === coach.id);
    if (coachGroups.length === 0) return;
    const allSubmitted = coachGroups.every(g => {
      const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
      return plan && ['submitted', 'approved', 'reviewed'].includes(plan.status);
    });
    if (allSubmitted) coachesWithAllPlans++;
  });

  const coachesWithGroups = coaches.filter(c => activeGroups.some(g => g.coachId === c.id)).length;

  return {
    totalCoaches: coaches.length,
    todaysTrainings: todaysTrainings.length,
    completionRate,
    totalTrainings: pastTrainings.length,
    completedTrainings,
    pendingPlans: coachesWithGroups - coachesWithAllPlans,
    coachesWithAllPlans,
    coachesWithGroups,
    upcomingEvents: events?.length || 0,
    totalCenters: centers.length,
  };
};

/**
 * Get dynamic alert items (relevant red flags only)
 */
export const getAlerts = (users, trainings, plans, groups, events, centers, currentYear, currentMonth) => {
  const coaches = getAllCoaches(users);
  const activeGroups = groups.filter(g => g.isActive !== false);
  const validGroupIds = getValidGroupIds(groups, centers);
  const alerts = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Only count past trainings belonging to valid groups (with real center)
  const pastTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && d <= today && validGroupIds.has(t.groupId);
  });

  // 1. Coaches with <50% completion rate (past trainings only)
  const lowCompletionCoaches = [];
  coaches.forEach(coach => {
    const coachTrainings = pastTrainings.filter(t => t.coachId === coach.id);
    if (coachTrainings.length < 3) return;
    const completed = coachTrainings.filter(t => t.status === 'completed').length;
    const rate = Math.round((completed / coachTrainings.length) * 100);
    if (rate < 50) {
      lowCompletionCoaches.push({ name: coach.displayName, rate });
    }
  });
  if (lowCompletionCoaches.length > 0) {
    alerts.push({
      type: 'danger',
      title: `${lowCompletionCoaches.length} מאמנים עם ביצוע נמוך מ-50%`,
      details: lowCompletionCoaches.map(c => `${c.name} (${c.rate}%)`).join(', ')
    });
  }

  // 2. Coaches without any submitted monthly plans
  const coachesWithoutPlans = [];
  coaches.forEach(coach => {
    const coachGroups = activeGroups.filter(g => g.coachId === coach.id);
    if (coachGroups.length === 0) return;
    const hasAnySubmitted = coachGroups.some(g => {
      const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
      return plan && ['submitted', 'approved', 'reviewed'].includes(plan.status);
    });
    if (!hasAnySubmitted) {
      coachesWithoutPlans.push(coach.displayName);
    }
  });
  if (coachesWithoutPlans.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${coachesWithoutPlans.length} מאמנים טרם הגישו תוכנית חודשית`,
      details: coachesWithoutPlans.join(', ')
    });
  }

  // 3. Cancelled trainings this month (only if significant)
  const cancelledCount = pastTrainings.filter(t => t.status === 'cancelled').length;
  const cancelRate = pastTrainings.length > 0 ? Math.round((cancelledCount / pastTrainings.length) * 100) : 0;
  if (cancelledCount > 3 || cancelRate > 15) {
    alerts.push({
      type: 'warning',
      title: `${cancelledCount} אימונים בוטלו החודש (${cancelRate}%)`,
      details: null
    });
  }

  // 4. Low org-wide completion (if below 60%)
  const totalCompleted = pastTrainings.filter(t => t.status === 'completed').length;
  const orgRate = pastTrainings.length > 0 ? Math.round((totalCompleted / pastTrainings.length) * 100) : 0;
  if (pastTrainings.length >= 5 && orgRate < 60) {
    alerts.push({
      type: 'danger',
      title: `שיעור ביצוע ארגוני נמוך: ${orgRate}%`,
      details: `${totalCompleted} מתוך ${pastTrainings.length} אימונים בוצעו`
    });
  }

  // 5. Plan submission rate below 50% (if there are coaches with groups)
  const coachesWithGroups = coaches.filter(c => activeGroups.some(g => g.coachId === c.id));
  if (coachesWithGroups.length > 0) {
    const submittedCount = coachesWithGroups.filter(coach => {
      const coachGroups = activeGroups.filter(g => g.coachId === coach.id);
      return coachGroups.every(g => {
        const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
        return plan && ['submitted', 'approved', 'reviewed'].includes(plan.status);
      });
    }).length;
    const planRate = Math.round((submittedCount / coachesWithGroups.length) * 100);
    if (planRate < 50 && coachesWithGroups.length >= 3) {
      alerts.push({
        type: 'warning',
        title: `רק ${planRate}% מהמאמנים הגישו תוכניות מלאות`,
        details: `${submittedCount} מתוך ${coachesWithGroups.length} מאמנים`
      });
    }
  }

  return alerts;
};

/**
 * Get today's trainings grouped by center
 */
export const getTodayTrainingsByCenter = (trainings, groups, users, centers) => {
  const today = new Date();
  const todaysTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && isSameDay(d, today);
  });

  return centers.map(center => {
    const centerGroupIds = groups
      .filter(g => g.centerId === center.id && g.isActive !== false)
      .map(g => g.id);

    const centerTrainings = todaysTrainings.filter(t => centerGroupIds.includes(t.groupId));
    const completed = centerTrainings.filter(t => t.status === 'completed').length;

    return {
      centerId: center.id,
      centerName: center.name,
      total: centerTrainings.length,
      completed,
      pending: centerTrainings.length - completed
    };
  }).filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
};

/**
 * Get center comparison stats - only centers with activity
 * Only counts trainings belonging to active groups (consistent with other funcs)
 */
export const getCenterComparison = (users, trainings, plans, groups, centers, currentYear, currentMonth) => {
  const activeGroups = groups.filter(g => g.isActive !== false);
  const validGroupIds = getValidGroupIds(groups, centers);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const pastTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && d <= today && validGroupIds.has(t.groupId);
  });

  return centers.map(center => {
    const centerCoaches = users.filter(u =>
      u.role === 'coach' && u.isActive !== false && u.centerIds?.includes(center.id)
    );
    const centerGroups = activeGroups.filter(g => g.centerId === center.id);
    const centerGroupIds = centerGroups.map(g => g.id);
    const centerTrainings = pastTrainings.filter(t => centerGroupIds.includes(t.groupId));
    const completed = centerTrainings.filter(t => t.status === 'completed').length;
    const cancelled = centerTrainings.filter(t => t.status === 'cancelled').length;
    const notCompleted = centerTrainings.length - completed - cancelled;
    const completionRate = centerTrainings.length > 0
      ? Math.round((completed / centerTrainings.length) * 100) : 0;

    let plansSubmitted = 0;
    let plansDraft = 0;
    let plansMissing = 0;
    let plansTotal = 0;
    const coachDetails = [];

    const processedCoachIds = new Set();

    centerCoaches.forEach(coach => {
      processedCoachIds.add(coach.id);
      const coachGroups = centerGroups.filter(g => g.coachId === coach.id);
      plansTotal += coachGroups.length;
      let cSubmitted = 0, cDraft = 0, cMissing = 0;
      const coachTrainings = centerTrainings.filter(t => t.coachId === coach.id);
      const coachCompleted = coachTrainings.filter(t => t.status === 'completed').length;

      coachGroups.forEach(g => {
        const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
        if (plan && ['submitted', 'approved', 'reviewed'].includes(plan.status)) {
          plansSubmitted++;
          cSubmitted++;
        } else if (plan && plan.status === 'draft') {
          plansDraft++;
          cDraft++;
        } else {
          plansMissing++;
          cMissing++;
        }
      });

      if (coachGroups.length > 0 || coachTrainings.length > 0) {
        coachDetails.push({
          id: coach.id,
          name: coach.displayName,
          groups: coachGroups.length,
          trainings: coachTrainings.length,
          completedTrainings: coachCompleted,
          trainingRate: coachTrainings.length > 0 ? Math.round((coachCompleted / coachTrainings.length) * 100) : 0,
          plansSubmitted: cSubmitted,
          plansDraft: cDraft,
          plansMissing: cMissing,
          plansTotal: coachGroups.length
        });
      }
    });

    // Also include coaches not in centerCoaches but who have trainings in this center
    // (e.g. inactive/deleted coaches whose trainings still exist)
    const extraCoachIds = [...new Set(centerTrainings.map(t => t.coachId).filter(id => id && !processedCoachIds.has(id)))];
    extraCoachIds.forEach(coachId => {
      const coach = users.find(u => u.id === coachId);
      const coachTrainings = centerTrainings.filter(t => t.coachId === coachId);
      const coachCompleted = coachTrainings.filter(t => t.status === 'completed').length;

      if (coachTrainings.length > 0) {
        coachDetails.push({
          id: coachId,
          name: coach?.displayName || 'מאמן לא ידוע',
          groups: 0,
          trainings: coachTrainings.length,
          completedTrainings: coachCompleted,
          trainingRate: coachTrainings.length > 0 ? Math.round((coachCompleted / coachTrainings.length) * 100) : 0,
          plansSubmitted: 0,
          plansDraft: 0,
          plansMissing: 0,
          plansTotal: 0
        });
      }
    });

    return {
      id: center.id,
      name: center.name,
      coaches: centerCoaches.length,
      groups: centerGroups.length,
      trainings: centerTrainings.length,
      completed,
      cancelled,
      notCompleted,
      completionRate,
      plansSubmitted,
      plansDraft,
      plansMissing,
      plansTotal,
      planRate: plansTotal > 0 ? Math.round((plansSubmitted / plansTotal) * 100) : 0,
      hasActivity: centerCoaches.length > 0 || centerGroups.length > 0,
      coachDetails
    };
  }).sort((a, b) => b.completionRate - a.completionRate);
};

/**
 * Get plan submission status per coach (with center name)
 */
export const getPlanSubmissionStatus = (users, plans, groups, centers, currentYear, currentMonth) => {
  const coaches = getAllCoaches(users);
  const activeGroups = groups.filter(g => g.isActive !== false);

  const submitted = [];
  const notSubmitted = [];

  coaches.forEach(coach => {
    const coachGroups = activeGroups.filter(g => g.coachId === coach.id);
    if (coachGroups.length === 0) return;

    let groupsSubmitted = 0;
    coachGroups.forEach(g => {
      const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
      if (plan && ['submitted', 'approved', 'reviewed'].includes(plan.status)) {
        groupsSubmitted++;
      }
    });

    const centerName = getCoachCenterName(coach, centers);

    const entry = {
      id: coach.id,
      name: coach.displayName,
      centerName,
      totalGroups: coachGroups.length,
      submittedGroups: groupsSubmitted,
      percentage: Math.round((groupsSubmitted / coachGroups.length) * 100)
    };

    if (groupsSubmitted === coachGroups.length) {
      submitted.push(entry);
    } else {
      notSubmitted.push(entry);
    }
  });

  return { submitted, notSubmitted: notSubmitted.sort((a, b) => a.percentage - b.percentage) };
};

/**
 * Get top and bottom performing coaches (NO OVERLAP)
 * Only coaches with 3+ past trainings qualify
 */
export const getTopBottomCoaches = (users, trainings, groups, centers) => {
  const coaches = getAllCoaches(users);
  const validGroupIds = getValidGroupIds(groups, centers);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const pastTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && d <= today && validGroupIds.has(t.groupId);
  });

  const coachStats = coaches.map(coach => {
    const coachTrainings = pastTrainings.filter(t => t.coachId === coach.id);
    const total = coachTrainings.length;
    const completed = coachTrainings.filter(t => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const centerName = getCoachCenterName(coach, centers);

    return { id: coach.id, name: coach.displayName, centerName, total, completed, rate };
  }).filter(c => c.total >= 3);

  const sorted = [...coachStats].sort((a, b) => b.rate - a.rate);

  // No overlap: top 5, then bottom 5 from remaining
  const top = sorted.slice(0, 5);
  const topIds = new Set(top.map(c => c.id));
  const remaining = sorted.filter(c => !topIds.has(c.id));
  const bottom = [...remaining].reverse().slice(0, 5);

  return { top, bottom, all: sorted };
};

/**
 * Training execution pie chart data (past trainings only)
 * Returns org summary + per-center + per-coach breakdown
 * Only counts trainings belonging to active groups (consistent totals)
 */
export const getTrainingExecutionData = (trainings, groups, users, centers) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const activeGroups = groups.filter(g => g.isActive !== false);
  const validGroupIds = getValidGroupIds(groups, centers);

  // Only count past trainings that belong to valid groups (with real center)
  const pastTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && d <= today && validGroupIds.has(t.groupId);
  });

  const completed = pastTrainings.filter(t => t.status === 'completed').length;
  const cancelled = pastTrainings.filter(t => t.status === 'cancelled').length;
  const notCompleted = pastTrainings.length - completed - cancelled;

  // Per center breakdown
  const byCenter = centers.map(center => {
    const centerGroupIds = activeGroups
      .filter(g => g.centerId === center.id)
      .map(g => g.id);
    const centerTrainings = pastTrainings.filter(t => centerGroupIds.includes(t.groupId));
    const cCompleted = centerTrainings.filter(t => t.status === 'completed').length;
    const cCancelled = centerTrainings.filter(t => t.status === 'cancelled').length;

    return {
      name: center.name,
      total: centerTrainings.length,
      completed: cCompleted,
      cancelled: cCancelled,
      notCompleted: centerTrainings.length - cCompleted - cCancelled,
      rate: centerTrainings.length > 0 ? Math.round((cCompleted / centerTrainings.length) * 100) : 0
    };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // Per coach breakdown - derive from trainings so NO training is missing
  const coachIds = [...new Set(pastTrainings.map(t => t.coachId).filter(Boolean))];
  const byCoachRaw = coachIds.map(coachId => {
    const coach = users.find(u => u.id === coachId);
    const coachTrainings = pastTrainings.filter(t => t.coachId === coachId);
    const cCompleted = coachTrainings.filter(t => t.status === 'completed').length;
    const cCancelled = coachTrainings.filter(t => t.status === 'cancelled').length;
    const centerName = coach ? getCoachCenterName(coach, centers) : null;

    return {
      name: coach?.displayName || 'מאמן לא ידוע',
      centerName,
      total: coachTrainings.length,
      completed: cCompleted,
      cancelled: cCancelled,
      notCompleted: coachTrainings.length - cCompleted - cCancelled,
    };
  }).filter(c => c.total > 0);

  // Merge entries with the same coach name (same person may have multiple coachIds)
  const mergedMap = new Map();
  byCoachRaw.forEach(c => {
    if (mergedMap.has(c.name)) {
      const existing = mergedMap.get(c.name);
      existing.total += c.total;
      existing.completed += c.completed;
      existing.cancelled += c.cancelled;
      existing.notCompleted += c.notCompleted;
      if (!existing.centerName && c.centerName) existing.centerName = c.centerName;
    } else {
      mergedMap.set(c.name, { ...c });
    }
  });
  const byCoach = [...mergedMap.values()].map(c => ({
    ...c,
    rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
  })).sort((a, b) => b.total - a.total);

  return {
    total: pastTrainings.length,
    completed,
    notCompleted,
    cancelled,
    rate: pastTrainings.length > 0 ? Math.round((completed / pastTrainings.length) * 100) : 0,
    byCenter,
    byCoach
  };
};

/**
 * Plan submission pie chart data
 * Returns org summary + per-center + per-coach breakdown
 */
export const getPlanSubmissionData = (users, plans, groups, centers, currentYear, currentMonth) => {
  const coaches = getAllCoaches(users);
  const activeGroups = groups.filter(g => g.isActive !== false);

  let totalPlans = 0;
  let submittedPlans = 0;
  let draftPlans = 0;
  let missingPlans = 0;

  const coachDetails = [];

  coaches.forEach(coach => {
    const coachGroups = activeGroups.filter(g => g.coachId === coach.id);
    if (coachGroups.length === 0) return;

    let cSubmitted = 0;
    let cDraft = 0;
    let cMissing = 0;

    coachGroups.forEach(g => {
      totalPlans++;
      const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
      if (plan && ['submitted', 'approved', 'reviewed'].includes(plan.status)) {
        submittedPlans++;
        cSubmitted++;
      } else if (plan && plan.status === 'draft') {
        draftPlans++;
        cDraft++;
      } else {
        missingPlans++;
        cMissing++;
      }
    });

    const centerName = getCoachCenterName(coach, centers);
    coachDetails.push({
      name: coach.displayName,
      centerName,
      total: coachGroups.length,
      submitted: cSubmitted,
      draft: cDraft,
      missing: cMissing
    });
  });

  // Per center
  const byCenter = centers.map(center => {
    const centerCoaches = coaches.filter(c => c.centerIds?.includes(center.id));
    const centerGroups = activeGroups.filter(g => g.centerId === center.id);
    let cSubmitted = 0;
    let cDraft = 0;
    let cMissing = 0;

    centerCoaches.forEach(coach => {
      const coachCenterGroups = centerGroups.filter(g => g.coachId === coach.id);
      coachCenterGroups.forEach(g => {
        const plan = plans.find(p => p.groupId === g.id && p.year === currentYear && p.month === currentMonth);
        if (plan && ['submitted', 'approved', 'reviewed'].includes(plan.status)) {
          cSubmitted++;
        } else if (plan && plan.status === 'draft') {
          cDraft++;
        } else {
          cMissing++;
        }
      });
    });

    const total = cSubmitted + cDraft + cMissing;
    return { name: center.name, total, submitted: cSubmitted, draft: cDraft, missing: cMissing };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return {
    total: totalPlans,
    submitted: submittedPlans,
    draft: draftPlans,
    missing: missingPlans,
    rate: totalPlans > 0 ? Math.round((submittedPlans / totalPlans) * 100) : 0,
    byCenter,
    byCoach: coachDetails.sort((a, b) => b.total - a.total)
  };
};

/**
 * Get coaches list grouped by center for stat card modal
 */
export const getCoachesListByCenter = (users, centers) => {
  const coaches = getAllCoaches(users);
  return centers.map(center => {
    const centerCoaches = coaches.filter(c => c.centerIds?.includes(center.id));
    return {
      centerName: center.name,
      coaches: centerCoaches.map(c => ({ id: c.id, name: c.displayName }))
    };
  }).filter(c => c.coaches.length > 0);
};

/**
 * Get today's trainings detail list with coach/group/time info
 */
export const getTodayTrainingsDetail = (trainings, groups, users, centers) => {
  const today = new Date();
  const todaysTrainings = trainings.filter(t => {
    const d = normalizeDate(t.date);
    return d && isSameDay(d, today);
  });

  const activeGroups = groups.filter(g => g.isActive !== false);

  return todaysTrainings.map(t => {
    const coach = users.find(u => u.id === t.coachId);
    const group = activeGroups.find(g => g.id === t.groupId);
    const center = centers.find(c => c.id === group?.centerId);
    const d = normalizeDate(t.date);
    const time = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';

    return {
      id: t.id,
      coachName: coach?.displayName || 'מאמן',
      groupName: group?.name || t.groupName || 'קבוצה',
      centerName: center?.name || '',
      time,
      status: t.status
    };
  }).sort((a, b) => a.time.localeCompare(b.time));
};
