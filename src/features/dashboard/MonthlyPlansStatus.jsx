import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle, Clock, XCircle, Edit3, ChevronLeft, AlertTriangle } from 'lucide-react';
import { PLAN_STATUS, HEBREW_MONTHS } from '../../config/constants';
import styles from './MonthlyPlansStatus.module.css';

const STATUS_CONFIG = {
    [PLAN_STATUS.APPROVED]: {
        label: 'אושרה',
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

function MonthlyPlansStatus({ plans, groups }) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthName = HEBREW_MONTHS[currentMonth];

    // Build status per group for current month
    const groupStatuses = useMemo(() => {
        if (!groups?.length) return [];

        return groups.map(group => {
            const plan = plans.find(
                p => p.groupId === group.id && p.year === currentYear && p.month === currentMonth
            );

            return {
                groupId: group.id,
                groupName: group.name,
                status: plan?.status || null,
                feedback: plan?.managerFeedback || null,
                managerNotes: plan?.managerNotes || null,
                planId: plan?.id || null,
            };
        });
    }, [plans, groups, currentYear, currentMonth]);

    // Check if there are any action items
    const hasRejected = groupStatuses.some(g => g.status === PLAN_STATUS.REJECTED);
    const hasMissing = groupStatuses.some(g => !g.status);
    const needsAttention = hasRejected || hasMissing;

    if (groupStatuses.length === 0) return null;

    return (
        <div className={`${styles.card} ${needsAttention ? styles.attentionCard : ''}`}>
            <div className={styles.groupList}>
                {groupStatuses.map(({ groupId, groupName, status, feedback }) => {
                    const config = status ? STATUS_CONFIG[status] : null;
                    const StatusIcon = config?.icon || AlertTriangle;
                    const statusClass = config?.className || 'missing';
                    const statusLabel = config?.label || 'לא הוגשה';

                    return (
                        <Link
                            key={groupId}
                            to={`/monthly-plans?groupId=${groupId}`}
                            className={styles.groupRow}
                        >
                            <div className={styles.groupInfo}>
                                <span className={styles.groupName}>{groupName}</span>
                                {status === PLAN_STATUS.REJECTED && feedback && (
                                    <span className={styles.feedback}>"{feedback}"</span>
                                )}
                            </div>
                            <div className={`${styles.statusBadge} ${styles[statusClass]}`}>
                                <StatusIcon size={14} />
                                <span>{statusLabel}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default MonthlyPlansStatus;
