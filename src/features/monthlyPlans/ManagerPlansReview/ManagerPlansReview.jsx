import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, CheckCircle, AlertCircle, Clock, XCircle, User, Award, Percent, ChevronRight, ChevronLeft } from 'lucide-react';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useMonthlyPlansStore from '../../../stores/monthlyPlansStore';
import useUsersStore from '../../../stores/usersStore';
import { HEBREW_MONTHS } from '../../../services/monthlyPlans';
import { PLAN_STATUS, ROLES } from '../../../config/constants';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import StatusIndicator from '../../../components/ui/StatusIndicator/StatusIndicator';
import styles from './ManagerPlansReview.module.css';

// Helper to get initials
const getInitials = (name) => {
    if (!name) return '?';
    if (/^[a-zA-Z]+$/.test(name)) return name.slice(0, 2).toUpperCase(); // English
    return name.split(' ').map(n => n[0]).join('').slice(0, 2); // Hebrew/Hebrew
};

function ManagerPlansReview() {
    const navigate = useNavigate();
    const { userData, isSupervisor, isCenterManager } = useAuthStore();
    const { groups, fetchGroups, isLoading: groupsLoading } = useGroupsStore();
    const { users, fetchUsers, isLoading: usersLoading } = useUsersStore();
    const { plans, fetchAllPlans, approvePlan, rejectPlan, isLoading: plansLoading } = useMonthlyPlansStore();

    // Filters
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [expandedCoaches, setExpandedCoaches] = useState({});

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

    const handleViewPlan = (groupId) => {
        navigate(`/monthly-plans/edit?groupId=${groupId}&year=${selectedYear}&month=${selectedMonth}&view=true`);
    };

    const handleApprovePlan = async (e, plan, coachId, groupName) => {
        e.stopPropagation();
        const result = await approvePlan(plan.id, coachId, groupName);
        if (!result.success) {
            alert('שגיאה באישור התוכנית');
        }
    };

    const handleRejectPlan = async (e, plan, groupName) => {
        e.stopPropagation();
        const feedback = window.prompt('סיבת הדחייה (אופציונלי):') ?? '';
        const result = await rejectPlan(plan.id, feedback, groupName);
        if (!result.success) {
            alert('שגיאה בדחיית התוכנית');
        }
    };

    const isLoading = groupsLoading || usersLoading || plansLoading;

    if (isLoading && coaches.length === 0) return <Spinner.FullPage />;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.title}>דשבורד אישור תכניות</h1>
                        <p className={styles.subtitle}>מעקב ובקרה אחר הגשות תכניות חודשיות</p>
                    </div>
                    <div className={styles.monthNav}>
                        <button
                            className={styles.monthNavBtn}
                            onClick={() => navigateMonth(1)}
                            aria-label="חודש הבא"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <span className={styles.monthLabel}>
                            {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                        </span>
                        <button
                            className={styles.monthNavBtn}
                            onClick={() => navigateMonth(-1)}
                            aria-label="חודש קודם"
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
                            if (stats.totalGroups === 0) return null; // Skip coaches with no groups

                            const isExpanded = expandedCoaches[coach.id];

                            return (
                                <>
                                    <tr
                                        key={coach.id}
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
                                                                if (plan) handleViewPlan(group.id);
                                                            }}
                                                            style={{ cursor: plan ? 'pointer' : 'default' }}
                                                        >
                                                            <span className={styles.groupName}>{group.name}</span>

                                                            <StatusIndicator status={status === 'missing' ? 'missing' : status} />

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
                                                                        onClick={(e) => handleRejectPlan(e, plan, group.name)}
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
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ManagerPlansReview;
