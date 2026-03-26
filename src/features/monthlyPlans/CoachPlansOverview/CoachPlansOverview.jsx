import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    FileText,
    CheckCircle,
    Circle,
    Clock,
    XCircle,
    X,
    AlertTriangle,
    Edit3,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    MessageSquare,
    Send,
    Users,
    MapPin,
    Eye,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';

import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useMonthlyPlansStore from '../../../stores/monthlyPlansStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import useCommentsStore from '../../../stores/commentsStore';
import { PLAN_STATUS, HEBREW_MONTHS, HEBREW_DAYS } from '../../../config/constants';
import { normalizeDate } from '../../../utils/dateUtils';
import { notifyRole, notifyCenterManagers } from '../../../services/notifications';
import Spinner from '../../../components/ui/Spinner';
import styles from './CoachPlansOverview.module.css';

const ENTITY_TYPE_MONTHLY_PLAN = 'monthlyPlan';

const STATUS_CONFIG = {
    [PLAN_STATUS.APPROVED]: {
        label: 'הוגש',
        icon: CheckCircle,
        className: 'approved',
    },
    [PLAN_STATUS.SUBMITTED]: {
        label: 'ממתינה לאישור',
        icon: Clock,
        className: 'submitted',
    },
    [PLAN_STATUS.REJECTED]: {
        label: 'נדחתה',
        icon: XCircle,
        className: 'rejected',
    },
    [PLAN_STATUS.DRAFT]: {
        label: 'טיוטה',
        icon: Edit3,
        className: 'draft',
    },
};

function CoachPlansOverview() {
    const location = useLocation();
    const { userData } = useAuthStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { plans, fetchCoachPlans, isLoading } = useMonthlyPlansStore();
    const { trainings, fetchTrainings } = useTrainingsStore();
    const {
        comments,
        fetchComments,
        add: addComment,
        isLoading: commentsLoading,
    } = useCommentsStore();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [commentTexts, setCommentTexts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [planComments, setPlanComments] = useState({});
    const [previewModal, setPreviewModal] = useState(null); // { groupId, groupName }
    const cardRefs = useRef({});

    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    const monthName = HEBREW_MONTHS[selectedMonth];
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

    // Navigate months
    const goToPreviousMonth = useCallback(() => {
        setSelectedDate(prev => subMonths(prev, 1));
    }, []);

    const goToNextMonth = useCallback(() => {
        setSelectedDate(prev => addMonths(prev, 1));
    }, []);

    // Fetch groups and plans
    useEffect(() => {
        if (userData?.id) {
            fetchGroups(userData.id);
        }
    }, [userData, fetchGroups]);

    useEffect(() => {
        if (userData?.id) {
            fetchCoachPlans(userData.id, selectedYear);
        }
    }, [userData, fetchCoachPlans, selectedYear]);

    // Fetch trainings for selected month
    useEffect(() => {
        if (userData?.id) {
            const start = startOfMonth(selectedDate);
            const end = endOfMonth(selectedDate);
            fetchTrainings(userData.id, start, end);
        }
    }, [userData, fetchTrainings, selectedDate]);

    // Build group statuses
    const groupStatuses = useMemo(() => {
        if (!groups?.length) return [];

        return groups.map(group => {
            const plan = plans.find(
                p => p.groupId === group.id && p.year === selectedYear && p.month === selectedMonth
            );

            const groupTrainings = trainings.filter(
                t => t.groupId === group.id
            );

            return {
                groupId: group.id,
                groupName: group.name,
                centerId: plan?.centerId || group.centerId || null,
                status: plan?.status || null,
                feedback: plan?.managerFeedback || null,
                managerNotes: plan?.managerNotes || null,
                managerName: plan?.managerName || null,
                planId: plan?.id || null,
                submittedAt: plan?.submittedAt || null,
                updatedAt: plan?.updatedAt || null,
                trainingCount: groupTrainings.length,
            };
        });
    }, [plans, groups, trainings, selectedYear, selectedMonth]);

    // Fetch comments for all plans that have IDs
    useEffect(() => {
        const fetchAllPlanComments = async () => {
            const plansWithIds = groupStatuses.filter(g => g.planId);
            const commentsMap = {};

            for (const group of plansWithIds) {
                try {
                    const { getComments } = await import('../../../services/comments');
                    const planCommentsData = await getComments(ENTITY_TYPE_MONTHLY_PLAN, group.planId);
                    commentsMap[group.planId] = planCommentsData;
                } catch {
                    commentsMap[group.planId] = [];
                }
            }

            setPlanComments(commentsMap);
        };

        if (groupStatuses.length > 0) {
            fetchAllPlanComments();
        }
    }, [groupStatuses.length, plans]);

    // Scroll to hash target
    useEffect(() => {
        const hash = location.hash;
        if (hash && hash.startsWith('#plan-')) {
            const groupId = hash.replace('#plan-', '');
            setTimeout(() => {
                const el = cardRefs.current[groupId];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add(styles.highlighted);
                    setTimeout(() => el.classList.remove(styles.highlighted), 2000);
                }
            }, 500);
        }
    }, [location.hash, groupStatuses]);

    const summaryStats = useMemo(() => {
        const total = groupStatuses.length;
        const submitted = groupStatuses.filter(g =>
            g.status === PLAN_STATUS.SUBMITTED || g.status === PLAN_STATUS.APPROVED
        ).length;
        const rejected = groupStatuses.filter(g => g.status === PLAN_STATUS.REJECTED).length;
        const missing = groupStatuses.filter(g => !g.status || g.status === PLAN_STATUS.DRAFT).length;

        return { total, submitted, rejected, missing };
    }, [groupStatuses]);

    const toggleComments = (groupId) => {
        setExpandedComments(prev => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    const handleCommentChange = (planId, text) => {
        setCommentTexts(prev => ({ ...prev, [planId]: text }));
    };

    const handleSubmitComment = async (planId, groupName, centerId) => {
        const text = commentTexts[planId]?.trim();
        if (!text || !userData) return;

        const result = await addComment({
            text,
            authorId: userData.id,
            authorName: userData.name || userData.displayName || 'מאמן',
            entityType: ENTITY_TYPE_MONTHLY_PLAN,
            entityId: planId,
        });

        if (result?.success) {
            setCommentTexts(prev => ({ ...prev, [planId]: '' }));
            // Refresh comments for this plan
            try {
                const { getComments } = await import('../../../services/comments');
                const updated = await getComments(ENTITY_TYPE_MONTHLY_PLAN, planId);
                setPlanComments(prev => ({ ...prev, [planId]: updated }));
            } catch {
                // silent
            }

            // Notify managers about the new comment
            const coachName = userData.name || userData.displayName || 'מאמן';
            const notification = {
                title: 'תגובה חדשה על תכנית חודשית',
                message: `${coachName} הגיב/ה על תכנית חודשית של ${groupName || 'קבוצה'}`,
                type: 'info',
                relatedEntityType: 'monthlyPlan',
                relatedEntityId: planId,
                link: '/monthly-plans/review',
            };
            try {
                await notifyRole('supervisor', notification);
                if (centerId) {
                    await notifyCenterManagers(centerId, notification);
                }
            } catch {
                // silent - don't block the UI for notification failures
            }
        }
    };

    const formatRelativeTime = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'עכשיו';
        if (diffMin < 60) return `לפני ${diffMin} דקות`;
        if (diffHours < 24) return `לפני ${diffHours} שעות`;
        if (diffDays < 7) return `לפני ${diffDays} ימים`;
        return format(d, 'dd/MM/yyyy', { locale: he });
    };

    const formatSubmittedDate = (date) => {
        if (!date) return null;
        const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
        return format(d, 'dd/MM/yyyy HH:mm', { locale: he });
    };

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <Spinner />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>הגשת תכניות חודשיות</h1>
                <p className={styles.subtitle}>סטטוס הגשה לפי קבוצה</p>
            </div>

            {/* Month Navigation */}
            <div className={styles.monthNav}>
                <button
                    className={styles.monthNavBtn}
                    onClick={goToPreviousMonth}
                    aria-label="חודש קודם"
                >
                    <ChevronRight size={20} />
                </button>
                <span className={`${styles.monthLabel} ${isCurrentMonth ? styles.currentMonthLabel : ''}`}>
                    {monthName} {selectedYear}
                </span>
                <button
                    className={styles.monthNavBtn}
                    onClick={goToNextMonth}
                    aria-label="חודש הבא"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Summary */}
            <div className={styles.summaryRow}>
                <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
                    <span className={styles.summaryValue}>{summaryStats.total}</span>
                    <span className={styles.summaryLabel}>קבוצות</span>
                </div>
                <div className={`${styles.summaryCard} ${styles.summarySubmitted}`}>
                    <span className={styles.summaryValue}>{summaryStats.submitted}</span>
                    <span className={styles.summaryLabel}>הוגשו</span>
                </div>
                {summaryStats.rejected > 0 && (
                    <div className={`${styles.summaryCard} ${styles.summaryRejected}`}>
                        <span className={styles.summaryValue}>{summaryStats.rejected}</span>
                        <span className={styles.summaryLabel}>נדחו</span>
                    </div>
                )}
                <div className={`${styles.summaryCard} ${styles.summaryMissing}`}>
                    <span className={styles.summaryValue}>{summaryStats.missing}</span>
                    <span className={styles.summaryLabel}>ממתינות</span>
                </div>
            </div>

            {/* Group Plans List */}
            <div className={styles.plansList}>
                {groupStatuses.map(({
                    groupId, groupName, centerId, status, feedback, managerNotes,
                    managerName, planId, submittedAt, trainingCount,
                }) => {
                    const config = status ? STATUS_CONFIG[status] : null;
                    const StatusIcon = config?.icon || AlertTriangle;
                    const statusClass = config?.className || 'missing';
                    const statusLabel = config?.label || 'לא הוגשה';

                    const needsAction = !status || status === PLAN_STATUS.DRAFT || status === PLAN_STATUS.REJECTED;
                    const currentPlanComments = planId ? (planComments[planId] || []) : [];
                    const isExpanded = expandedComments[groupId];

                    return (
                        <div
                            key={groupId}
                            id={`plan-${groupId}`}
                            ref={el => (cardRefs.current[groupId] = el)}
                            className={`${styles.planCard} ${needsAction ? styles.planNeedsAction : ''}`}
                        >
                            {/* Card Header */}
                            <div className={styles.planHeader}>
                                <div className={styles.planGroupInfo}>
                                    <span className={styles.planGroupName}>
                                        <Users size={16} className={styles.groupIcon} />
                                        {groupName}
                                    </span>
                                </div>
                                <div className={`${styles.planStatus} ${styles[statusClass]}`}>
                                    <StatusIcon size={16} />
                                    <span>{statusLabel}</span>
                                </div>
                            </div>

                            {/* Training count + submitted date */}
                            <div className={styles.planMeta}>
                                <span className={styles.metaItem}>
                                    <CalendarDays size={14} />
                                    {trainingCount} אימונים מתוכננים
                                </span>
                                {submittedAt && (
                                    <span className={styles.metaItem}>
                                        <Clock size={14} />
                                        הוגשה: {formatSubmittedDate(submittedAt)}
                                    </span>
                                )}
                            </div>

                            {/* Rejection feedback */}
                            {status === PLAN_STATUS.REJECTED && feedback && (
                                <div className={styles.feedbackBox}>
                                    <span className={styles.feedbackLabel}>
                                        סיבת דחייה{managerName ? ` (${managerName})` : ''}:
                                    </span>
                                    <span className={styles.feedbackText}>"{feedback}"</span>
                                </div>
                            )}

                            {/* Manager Notes */}
                            {managerNotes && (
                                <div className={styles.notesBox}>
                                    <span className={styles.notesLabel}>הערות מנהל:</span>
                                    <span className={styles.notesText}>{managerNotes}</span>
                                </div>
                            )}

                            {/* Actions row */}
                            <div className={styles.planActions}>
                                <button
                                    className={styles.actionLink}
                                    onClick={() => setPreviewModal({ groupId, groupName })}
                                >
                                    <Eye size={16} />
                                    צפה בתכנית
                                    <ChevronLeft size={14} />
                                </button>

                                {planId && (
                                    <button
                                        className={styles.commentsToggle}
                                        onClick={() => toggleComments(groupId)}
                                    >
                                        <MessageSquare size={16} />
                                        <span>
                                            תגובות
                                            {currentPlanComments.length > 0 && (
                                                <span className={styles.commentsBadge}>
                                                    {currentPlanComments.length}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Comments Section */}
                            {planId && isExpanded && (
                                <div className={styles.commentsSection}>
                                    {/* Comments list */}
                                    {currentPlanComments.length > 0 ? (
                                        <div className={styles.commentsList}>
                                            {currentPlanComments.map(comment => (
                                                <div key={comment.id} className={styles.commentItem}>
                                                    <div className={styles.commentHeader}>
                                                        <span className={styles.commentAuthor}>
                                                            {comment.authorName}
                                                        </span>
                                                        <span className={styles.commentTime}>
                                                            {formatRelativeTime(comment.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className={styles.commentText}>{comment.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={styles.noComments}>אין תגובות עדיין</p>
                                    )}

                                    {/* Add comment input */}
                                    <div className={styles.commentInput}>
                                        <input
                                            type="text"
                                            className={styles.commentField}
                                            placeholder="הוסף תגובה..."
                                            value={commentTexts[planId] || ''}
                                            onChange={e => handleCommentChange(planId, e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmitComment(planId, groupName, centerId);
                                                }
                                            }}
                                        />
                                        <button
                                            className={styles.sendBtn}
                                            onClick={() => handleSubmitComment(planId, groupName, centerId)}
                                            disabled={!commentTexts[planId]?.trim()}
                                            aria-label="שלח תגובה"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {groupStatuses.length === 0 && (
                    <div className={styles.emptyState}>
                        <FileText size={48} className={styles.emptyIcon} />
                        <p>אין קבוצות משויכות</p>
                        <p className={styles.emptyHint}>פנה למנהל המרכז לשיוך קבוצות</p>
                    </div>
                )}
            </div>

            {/* Plan Preview Modal */}
            {previewModal && (
                <PlanPreviewModal
                    groupId={previewModal.groupId}
                    groupName={previewModal.groupName}
                    trainings={trainings}
                    selectedDate={selectedDate}
                    monthName={monthName}
                    selectedYear={selectedYear}
                    onClose={() => setPreviewModal(null)}
                />
            )}
        </div>
    );
}

/* Plan Preview Bottom-Sheet Modal */
function PlanPreviewModal({ groupId, groupName, trainings, selectedDate, monthName, selectedYear, onClose }) {
    const groupTrainings = useMemo(() => {
        return trainings
            .filter(t => {
                if (t.groupId !== groupId) return false;
                const d = normalizeDate(t.date);
                return d && isSameMonth(d, selectedDate);
            })
            .sort((a, b) => {
                const da = normalizeDate(a.date);
                const db = normalizeDate(b.date);
                return (da || 0) - (db || 0);
            });
    }, [trainings, groupId, selectedDate]);

    const completed = groupTrainings.filter(t => t.status === 'completed').length;
    const cancelled = groupTrainings.filter(t => t.status === 'cancelled').length;
    const planned = groupTrainings.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

    const formatTrainingDate = (date) => {
        const d = normalizeDate(date);
        if (!d) return '';
        const dayName = HEBREW_DAYS[d.getDay()];
        return `יום ${dayName}, ${d.getDate()}/${d.getMonth() + 1}`;
    };

    const formatTrainingTime = (date) => {
        const d = normalizeDate(date);
        if (!d) return '';
        return format(d, 'HH:mm');
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>{groupName} — {monthName} {selectedYear}</h3>
                    <button className={styles.modalCloseBtn} onClick={onClose} aria-label="סגור">
                        <X size={20} />
                    </button>
                </div>

                {/* Summary meta */}
                <div className={styles.modalMeta}>
                    <span className={styles.modalMetaItem}>
                        <CalendarDays size={16} />
                        {groupTrainings.length} אימונים
                    </span>
                    {completed > 0 && (
                        <span className={styles.modalMetaItem}>
                            <CheckCircle size={16} />
                            {completed} בוצעו
                        </span>
                    )}
                    {planned > 0 && (
                        <span className={styles.modalMetaItem}>
                            <Clock size={16} />
                            {planned} מתוכננים
                        </span>
                    )}
                    {cancelled > 0 && (
                        <span className={styles.modalMetaItem}>
                            <XCircle size={16} />
                            {cancelled} בוטלו
                        </span>
                    )}
                </div>

                {/* Trainings list */}
                {groupTrainings.length > 0 ? (
                    <div className={styles.modalTrainingsList}>
                        <p className={styles.modalSectionTitle}>אימונים בחודש</p>
                        {groupTrainings.map(t => {
                            const isCompleted = t.status === 'completed';
                            const isCancelled = t.status === 'cancelled';

                            return (
                                <div
                                    key={t.id}
                                    className={`${styles.modalTrainingItem} ${isCompleted ? styles.modalTrainingCompleted : ''} ${isCancelled ? styles.modalTrainingCancelled : ''}`}
                                >
                                    <div className={styles.modalTrainingIcon}>
                                        {isCompleted ? (
                                            <CheckCircle size={18} className={styles.modalIconCompleted} />
                                        ) : isCancelled ? (
                                            <X size={18} className={styles.modalIconCancelled} />
                                        ) : (
                                            <Circle size={18} className={styles.modalIconPending} />
                                        )}
                                    </div>
                                    <div className={styles.modalTrainingInfo}>
                                        <span className={styles.modalTrainingTopic}>
                                            {t.topic || 'אימון'}
                                        </span>
                                        <span className={styles.modalTrainingMeta}>
                                            {formatTrainingDate(t.date)} · {formatTrainingTime(t.date)}
                                            {t.location && ` · ${t.location}`}
                                        </span>
                                    </div>
                                    <span className={`${styles.modalStatusLabel} ${isCompleted ? styles.modalLabelCompleted : isCancelled ? styles.modalLabelCancelled : styles.modalLabelPending}`}>
                                        {isCompleted ? 'בוצע' : isCancelled ? 'בוטל' : 'מתוכנן'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.modalEmpty}>
                        <CalendarDays size={32} />
                        <p>אין אימונים מתוכננים בחודש זה</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CoachPlansOverview;
