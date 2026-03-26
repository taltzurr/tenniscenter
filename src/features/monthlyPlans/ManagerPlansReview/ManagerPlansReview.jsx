import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, CheckCircle, AlertCircle, Clock, XCircle, User, Award, Percent, ChevronRight, ChevronLeft, Eye, Target, Calendar, MessageSquare, Send, Dumbbell, ArrowRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useMonthlyPlansStore from '../../../stores/monthlyPlansStore';
import useUsersStore from '../../../stores/usersStore';
import { getOrganizationTrainings } from '../../../services/trainings';
import { HEBREW_MONTHS, WEEK_STRUCTURE } from '../../../services/monthlyPlans';
import { PLAN_STATUS, ROLES } from '../../../config/constants';
import { normalizeDate } from '../../../utils/dateUtils';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import StatusIndicator from '../../../components/ui/StatusIndicator/StatusIndicator';
import TrainingDetailsModal from '../../dashboard/TrainingDetailsModal';
import styles from './ManagerPlansReview.module.css';

// Helper to get initials
const getInitials = (name) => {
    if (!name) return '?';
    if (/^[a-zA-Z]+$/.test(name)) return name.slice(0, 2).toUpperCase(); // English
    return name.split(' ').map(n => n[0]).join('').slice(0, 2); // Hebrew/Hebrew
};

function ManagerPlansReview() {
    const { userData, isSupervisor, isCenterManager } = useAuthStore();
    const { groups, fetchGroups, isLoading: groupsLoading } = useGroupsStore();
    const { users, fetchUsers, isLoading: usersLoading } = useUsersStore();
    const { plans, fetchAllPlans, approvePlan, rejectPlan, saveManagerNotes, isLoading: plansLoading } = useMonthlyPlansStore();

    // Filters
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [expandedCoaches, setExpandedCoaches] = useState({});
    const [previewPlan, setPreviewPlan] = useState(null); // { plan, groupName, coachName }
    const [previewTrainings, setPreviewTrainings] = useState([]);
    const [previewTrainingsLoading, setPreviewTrainingsLoading] = useState(false);
    const [managerNotes, setManagerNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState(null);

    const navigateMonth = useCallback((direction) => {
        let newMonth = selectedMonth + direction;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear -= 1; }
        else if (newMonth > 11) { newMonth = 0; newYear += 1; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    }, [selectedMonth, selectedYear]);

    // Fetch Data
    useEffect(() => {
        const loadUsersAndGroups = async () => {
            // 1. Fetch all users (to find coaches)
            await fetchUsers();

            // 2. Fetch groups — role-aware: supervisor gets all, center manager gets center-only
            if (userData?.id) {
                const centerId = isCenterManager() ? userData.managedCenterId : null;
                await fetchGroups(userData.id, isSupervisor(), centerId);
            }
        };
        loadUsersAndGroups();
    }, [fetchUsers, fetchGroups, userData]);

    // Fetch plans when filters change
    useEffect(() => {
        fetchAllPlans(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth, fetchAllPlans]);

    // Derived Data — filter coaches to center for center managers
    const coaches = useMemo(() => {
        const all = users.filter(u =>
            (u.role === ROLES.COACH || u.role === ROLES.CENTER_MANAGER) && u.isActive !== false
        );
        if (isCenterManager() && userData?.managedCenterId) {
            return all.filter(c => c.centerIds?.includes(userData.managedCenterId));
        }
        return all;
    }, [users, userData?.managedCenterId, isCenterManager]);

    // Aggregation Logic
    const getCoachStats = (coachId) => {
        // Find all groups for this coach
        // A group belongs to a coach if group.coachId === coachId OR coachId is in group.coaches array
        const coachGroups = groups.filter(g =>
            g.coachId === coachId || (g.coaches && g.coaches.includes(coachId))
        );

        // Find plans for this coach (already filtered by year/month in store)
        // Match plans to groups
        const stats = coachGroups.map(group => {
            const plan = plans.find(p => p.groupId === group.id);
            return {
                group,
                plan,
                status: plan ? plan.status : 'missing'
            };
        });

        const totalGroups = coachGroups.length;
        const submittedCount = stats.filter(s =>
            s.status === PLAN_STATUS.SUBMITTED ||
            s.status === PLAN_STATUS.APPROVED ||
            s.status === PLAN_STATUS.REVIEWED
        ).length; // Counting Submitted+Approved as "Submitted" for progress

        const approvedCount = stats.filter(s => s.status === PLAN_STATUS.APPROVED).length;

        const isComplete = totalGroups > 0 && submittedCount === totalGroups;
        const percent = totalGroups > 0 ? Math.round((submittedCount / totalGroups) * 100) : 0;

        return {
            totalGroups,
            submittedCount,
            approvedCount,
            isComplete,
            percent,
            details: stats
        };
    };

    // Overall Stats
    const overallStats = coaches.reduce((acc, coach) => {
        const stats = getCoachStats(coach.id);
        if (stats.totalGroups > 0) {
            acc.activeCoaches++;
            if (stats.isComplete) acc.completedCoaches++;
            if (stats.submittedCount < stats.totalGroups) acc.missingSubmissions++;
        }
        return acc;
    }, { activeCoaches: 0, completedCoaches: 0, missingSubmissions: 0 });

    const toggleExpand = (coachId) => {
        setExpandedCoaches(prev => ({ ...prev, [coachId]: !prev[coachId] }));
    };

    const handleViewPlan = async (plan, groupName, coachName) => {
        setPreviewPlan({ plan, groupName, coachName });
        setManagerNotes(plan.managerNotes || '');
        setNotesSaved(false);

        // Fetch trainings for this group in the selected month
        setPreviewTrainingsLoading(true);
        try {
            const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1));
            const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth, 1));
            const allTrainings = await getOrganizationTrainings(monthStart, monthEnd);
            const groupTrainings = allTrainings
                .filter(t => t.groupId === plan.groupId)
                .sort((a, b) => {
                    const dA = normalizeDate(a.date);
                    const dB = normalizeDate(b.date);
                    return (dA || 0) - (dB || 0);
                });
            setPreviewTrainings(groupTrainings);
        } catch (err) {
            console.error('Error fetching trainings for plan preview:', err);
            setPreviewTrainings([]);
        } finally {
            setPreviewTrainingsLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!previewPlan?.plan?.id) return;
        setNotesSaving(true);
        try {
            await saveManagerNotes(previewPlan.plan.id, managerNotes, previewPlan.plan.coachId, previewPlan.groupName);
            setNotesSaved(true);
            setTimeout(() => setNotesSaved(false), 3000);
        } catch (err) {
            console.error('Error saving notes:', err);
        } finally {
            setNotesSaving(false);
        }
    };

    const handleTrainingClick = (training) => {
        const tDate = normalizeDate(training.date);
        const dayStr = tDate ? format(tDate, 'EEEE', { locale: he }) : '';
        const dateStr = tDate ? format(tDate, 'd/M/yyyy') : '';
        const timeStr = tDate ? format(tDate, 'HH:mm') : '--:--';

        setSelectedTraining({
            id: training.id,
            topic: training.topic || 'נושא לא הוגדר',
            group: previewPlan.groupName,
            location: training.location || '',
            day: dayStr,
            fullDate: dateStr,
            time: timeStr,
            duration: training.duration || '',
            status: training.status || 'planned',
            periodType: training.periodType || '',
            gameSituation: training.gameSituation || '',
            gameComponent: training.gameComponent || '',
            trainingTopics: training.trainingTopics || [],
            equipment: training.equipment || '',
            description: training.description || training.notes || ''
        });
    };

    const handleApprovePlan = async (e, plan, coachId, groupName) => {
        e.stopPropagation();
        const result = await approvePlan(plan.id, coachId, groupName);
        if (!result.success) {
            alert('שגיאה באישור התוכנית');
        }
    };

    const handleRejectPlan = async (e, plan, groupName, coachId) => {
        e.stopPropagation();
        const feedback = window.prompt('סיבת הדחייה (אופציונלי):') ?? '';
        const result = await rejectPlan(plan.id, feedback, groupName, coachId);
        if (!result.success) {
            alert('שגיאה בדחיית התוכנית');
        }
    };

    const isLoading = groupsLoading || usersLoading || plansLoading;

    if (isLoading && coaches.length === 0) return <Spinner.FullPage />;

    return (
        <div className={styles.page}>
            {previewPlan ? (
                <>
                    <div className={styles.previewPageHeader}>
                        <button
                            className={styles.backButton}
                            onClick={() => { setPreviewPlan(null); setSelectedTraining(null); }}
                        >
                            <ArrowRight size={20} />
                            חזרה
                        </button>
                        <h1 className={styles.title}>תכנית אימונים – {previewPlan.groupName}</h1>
                    </div>

                    <div className={styles.previewContent}>
                        {/* Plan Meta */}
                        <div className={styles.previewMeta}>
                            <div className={styles.previewMetaItem}>
                                <span className={styles.previewMetaLabel}>מאמן</span>
                                <span className={styles.previewMetaValue}>{previewPlan.coachName}</span>
                            </div>
                            <div className={styles.previewMetaItem}>
                                <span className={styles.previewMetaLabel}>חודש</span>
                                <span className={styles.previewMetaValue}>{HEBREW_MONTHS[selectedMonth]} {selectedYear}</span>
                            </div>
                            <div className={styles.previewMetaItem}>
                                <span className={styles.previewMetaLabel}>סטטוס</span>
                                <StatusIndicator status={previewPlan.plan.status || 'draft'} />
                            </div>
                            <div className={styles.previewMetaItem}>
                                <span className={styles.previewMetaLabel}>אימונים</span>
                                <span className={styles.previewMetaValue}>{previewTrainings.length}</span>
                            </div>
                        </div>

                        {/* Trainings List */}
                        <div className={styles.previewSection}>
                            <h3 className={styles.previewSectionTitle}>
                                <Dumbbell size={18} />
                                אימונים מתוכננים
                            </h3>

                            {previewTrainingsLoading ? (
                                <div className={styles.previewLoadingRow}>
                                    <Spinner size="small" /> טוען אימונים...
                                </div>
                            ) : previewTrainings.length === 0 ? (
                                <div className={styles.previewSectionBody}>
                                    <span className={styles.previewEmpty}>לא נמצאו אימונים לחודש זה</span>
                                </div>
                            ) : (
                                <div className={styles.trainingsList}>
                                    {previewTrainings.map(training => {
                                        const tDate = normalizeDate(training.date);
                                        const dayStr = tDate ? format(tDate, 'EEEE', { locale: he }) : '';
                                        const dateStr = tDate ? format(tDate, 'd/M') : '';
                                        const timeStr = tDate ? format(tDate, 'HH:mm') : '--:--';
                                        const statusClass = training.status === 'completed' ? styles.trainingCompleted
                                            : training.status === 'cancelled' ? styles.trainingCancelled
                                            : styles.trainingPlanned;

                                        return (
                                            <div
                                                key={training.id}
                                                className={`${styles.trainingRow} ${statusClass}`}
                                                onClick={() => handleTrainingClick(training)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className={styles.trainingDate}>
                                                    <span className={styles.trainingDay}>{dateStr}</span>
                                                    <span className={styles.trainingDayName}>{dayStr}</span>
                                                </div>
                                                <div className={styles.trainingTime}>{timeStr}</div>
                                                <div className={styles.trainingInfo}>
                                                    <span className={styles.trainingTopic}>
                                                        {training.topic || 'נושא לא הוגדר'}
                                                    </span>
                                                    {training.location && (
                                                        <span className={styles.trainingLocation}>{training.location}</span>
                                                    )}
                                                </div>
                                                <div className={styles.trainingStatus}>
                                                    <StatusIndicator status={training.status || 'planned'} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Training Summary */}
                        {previewTrainings.length > 0 && (
                            <div className={styles.trainingSummary}>
                                <div className={styles.trainingSummaryItem}>
                                    <span className={styles.trainingSummaryValue} style={{ color: 'var(--success-600)' }}>
                                        {previewTrainings.filter(t => t.status === 'completed').length}
                                    </span>
                                    <span className={styles.trainingSummaryLabel}>בוצעו</span>
                                </div>
                                <div className={styles.trainingSummaryItem}>
                                    <span className={styles.trainingSummaryValue} style={{ color: 'var(--primary-600)' }}>
                                        {previewTrainings.filter(t => !t.status || t.status === 'planned' || t.status === 'draft').length}
                                    </span>
                                    <span className={styles.trainingSummaryLabel}>מתוכננים</span>
                                </div>
                                <div className={styles.trainingSummaryItem}>
                                    <span className={styles.trainingSummaryValue} style={{ color: 'var(--error-600)' }}>
                                        {previewTrainings.filter(t => t.status === 'cancelled').length}
                                    </span>
                                    <span className={styles.trainingSummaryLabel}>בוטלו</span>
                                </div>
                            </div>
                        )}

                        {/* Manager Feedback (from rejection) */}
                        {previewPlan.plan.managerFeedback && (
                            <div className={styles.previewSection}>
                                <h3 className={styles.previewSectionTitle} style={{ color: 'var(--error-700)' }}>
                                    <XCircle size={18} />
                                    סיבת דחייה
                                </h3>
                                <div className={styles.previewSectionBody} style={{ color: 'var(--error-700)', backgroundColor: 'var(--error-100)' }}>
                                    {previewPlan.plan.managerFeedback}
                                </div>
                            </div>
                        )}

                        {/* Manager Notes / Comments */}
                        {(isSupervisor() || isCenterManager()) && (
                            <div className={styles.previewSection}>
                                <h3 className={styles.previewSectionTitle}>
                                    <MessageSquare size={18} />
                                    הערות למאמן
                                </h3>
                                <textarea
                                    className={styles.notesTextarea}
                                    value={managerNotes}
                                    onChange={(e) => { setManagerNotes(e.target.value); setNotesSaved(false); }}
                                    placeholder="כתוב הערות לגבי תכנית האימונים... (המאמן יראה את ההערות)"
                                    rows={3}
                                />
                                <div className={styles.notesActions}>
                                    <Button
                                        size="small"
                                        variant="outline"
                                        onClick={handleSaveNotes}
                                        disabled={notesSaving}
                                    >
                                        {notesSaving ? (
                                            <>שומר...</>
                                        ) : notesSaved ? (
                                            <><CheckCircle size={14} /> נשמר!</>
                                        ) : (
                                            <><Send size={14} /> שמור הערות</>
                                        )}
                                    </Button>
                                    {notesSaved && (
                                        <span className={styles.notesSavedHint}>ההערות נשמרו והמאמן יקבל התראה</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Show existing notes for read-only (coach view, if ever accessed) */}
                        {!(isSupervisor() || isCenterManager()) && previewPlan.plan.managerNotes && (
                            <div className={styles.previewSection}>
                                <h3 className={styles.previewSectionTitle}>
                                    <MessageSquare size={18} />
                                    הערות המנהל
                                </h3>
                                <div className={styles.previewSectionBody}>
                                    {previewPlan.plan.managerNotes}
                                </div>
                            </div>
                        )}

                        {/* Approval actions at bottom */}
                        {(isSupervisor() || isCenterManager()) && previewPlan.plan.status === PLAN_STATUS.SUBMITTED && (
                            <div className={styles.previewActions}>
                                <Button
                                    variant="primary"
                                    onClick={(e) => {
                                        const coach = coaches.find(c =>
                                            c.displayName === previewPlan.coachName ||
                                            `${c.firstName} ${c.lastName}` === previewPlan.coachName
                                        );
                                        handleApprovePlan(e, previewPlan.plan, coach?.id, previewPlan.groupName);
                                        setPreviewPlan(null);
                                    }}
                                >
                                    אישור תכנית
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={(e) => {
                                        const rejectCoach = coaches.find(c =>
                                            c.displayName === previewPlan.coachName ||
                                            `${c.firstName} ${c.lastName}` === previewPlan.coachName
                                        );
                                        handleRejectPlan(e, previewPlan.plan, previewPlan.groupName, rejectCoach?.id);
                                        setPreviewPlan(null);
                                    }}
                                >
                                    דחייה
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Training Details Modal */}
                    <TrainingDetailsModal
                        training={selectedTraining}
                        isOpen={!!selectedTraining}
                        onClose={() => setSelectedTraining(null)}
                    />
                </>
            ) : (
                <>
                    <div className={styles.header}>
                        <div className={styles.headerRow}>
                            <div>
                                <h1 className={styles.title}>דשבורד אישור תכניות</h1>
                                <p className={styles.subtitle}>מעקב ובקרה אחר הגשות תכניות חודשיות</p>
                            </div>
                            <div className={styles.monthNav}>
                                <button
                                    className={styles.monthNavBtn}
                                    onClick={() => navigateMonth(-1)}
                                    aria-label="חודש קודם"
                                >
                                    <ChevronRight size={20} />
                                </button>
                                <span className={styles.monthLabel}>
                                    {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                                </span>
                                <button
                                    className={styles.monthNavBtn}
                                    onClick={() => navigateMonth(1)}
                                    aria-label="חודש הבא"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                                <User />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statValue}>{overallStats.activeCoaches}</span>
                                <span className={styles.statLabel}>מאמנים פעילים</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                                <CheckCircle />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statValue}>{overallStats.completedCoaches}</span>
                                <span className={styles.statLabel}>הגישו הכל</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'var(--warning-100)', color: 'var(--warning-600)' }}>
                                <Clock />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statValue}>{overallStats.missingSubmissions}</span>
                                <span className={styles.statLabel}>חסר הגשות</span>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <div className={styles.matrixCard}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>מאמן</th>
                                    <th>סטטוס הגשות</th>
                                    <th>התקדמות</th>
                                    <th>סטטוס כללי</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {coaches.map(coach => {
                                    const stats = getCoachStats(coach.id);
                                    if (stats.totalGroups === 0) return null;

                                    const isExpanded = expandedCoaches[coach.id];

                                    return (
                                        <React.Fragment key={coach.id}>
                                            <tr
                                                className={`${styles.coachRow} ${isExpanded ? styles.expanded : ''}`}
                                                onClick={() => toggleExpand(coach.id)}
                                            >
                                                <td>
                                                    <div className={styles.coachInfo}>
                                                        <div className={styles.avatar}>
                                                            {getInitials(coach.displayName || coach.firstName)}
                                                        </div>
                                                        <span>{coach.displayName || `${coach.firstName} ${coach.lastName}`}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.submissionInfo}>
                                                        <span>{stats.submittedCount} / {stats.totalGroups} קבוצות</span>
                                                        <span className={styles.mobileStatus}>
                                                            {stats.isComplete
                                                                ? <StatusIndicator status="approved" customText="מלא" />
                                                                : <StatusIndicator status="missing" customText={`חסר ${stats.totalGroups - stats.submittedCount}`} />
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.progressBar}>
                                                        <div
                                                            className={`${styles.progressFill} ${stats.isComplete ? 'complete' : ''}`}
                                                            style={{ width: `${stats.percent}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {stats.isComplete ? (
                                                        <StatusIndicator status="approved" customText="מלא" />
                                                    ) : (
                                                        <StatusIndicator status="missing" customText={`חסר ${stats.totalGroups - stats.submittedCount}`} />
                                                    )}
                                                </td>
                                                <td>
                                                    <ChevronDown className={styles.expandIcon} size={20} />
                                                </td>
                                            </tr>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <tr className={styles.detailsRow}>
                                                    <td colSpan="5">
                                                        <div className={styles.detailsContent}>
                                                            {stats.details.map(({ group, plan, status }) => (
                                                                <div
                                                                    key={group.id}
                                                                    className={styles.groupCard}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (plan) handleViewPlan(plan, group.name, coach.displayName || `${coach.firstName} ${coach.lastName}`);
                                                                    }}
                                                                    style={{ cursor: plan ? 'pointer' : 'default' }}
                                                                >
                                                                    <span className={styles.groupName}>{group.name}</span>

                                                                    <StatusIndicator status={status === 'missing' ? 'missing' : status} />

                                                                    {plan && (
                                                                        <button
                                                                            className={styles.viewPlanBtn}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewPlan(plan, group.name, coach.displayName || `${coach.firstName} ${coach.lastName}`);
                                                                            }}
                                                                            title="צפה בתכנית"
                                                                            aria-label="צפה בתכנית"
                                                                        >
                                                                            <Eye size={16} />
                                                                            <span className={styles.viewPlanLabel}>צפה בתכנית</span>
                                                                        </button>
                                                                    )}

                                                                    {(isSupervisor() || isCenterManager()) && plan && status === PLAN_STATUS.SUBMITTED && (
                                                                        <div className={styles.approvalActions} onClick={e => e.stopPropagation()}>
                                                                            <Button
                                                                                size="small"
                                                                                variant="primary"
                                                                                onClick={(e) => handleApprovePlan(e, plan, coach.id, group.name)}
                                                                            >
                                                                                אישור
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="danger"
                                                                                onClick={(e) => handleRejectPlan(e, plan, group.name, coach.id)}
                                                                            >
                                                                                דחייה
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default ManagerPlansReview;
