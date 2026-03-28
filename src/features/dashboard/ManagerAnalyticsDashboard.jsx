import { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BarChart3,
    BarChart2,
    CheckCircle,
    FileText,
    TrendingUp,
    TrendingDown,
    Building2,
    Users,
    AlertTriangle
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isSameMonth,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { getOrganizationTrainings } from '../../services/trainings';
import { getAllMonthlyPlans } from '../../services/monthlyPlans';
import { getAllGroups } from '../../services/groups';
import useAuthStore from '../../stores/authStore';
import useUsersStore from '../../stores/usersStore';
import useCentersStore from '../../stores/centersStore';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';
import CoachTrainingsModal from './CoachTrainingsModal';
import styles from './ManagerAnalyticsDashboard.module.css';

// ── Horizontal Bar Chart ──
const HorizontalBarChart = ({ data, color, label, icon: Icon }) => {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
                {Icon && <Icon size={18} />}
                <h2 className={styles.chartTitle}>{label}</h2>
                <span className={styles.sectionBadge}>{data.reduce((s, d) => s + d.count, 0)}</span>
            </div>
            <div className={styles.chartBars}>
                {data.map(item => (
                    <div key={item.name} className={styles.barRow}>
                        <span className={styles.barLabel}>{item.name}</span>
                        <div className={styles.barTrack}>
                            <div
                                className={styles.barFill}
                                style={{
                                    width: `${(item.count / max) * 100}%`,
                                    backgroundColor: color
                                }}
                            />
                        </div>
                        <span className={styles.barValue}>{item.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ManagerAnalyticsDashboard = () => {
    const { userData, isSupervisor, isCenterManager } = useAuthStore();
    const { users, fetchUsers } = useUsersStore();
    const { centers, fetchCenters } = useCentersStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trainings, setTrainings] = useState([]);
    const [plans, setPlans] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [expandedExecution, setExpandedExecution] = useState({});
    const [expandedPlans, setExpandedPlans] = useState({});

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const isCurrentMonth = isSameMonth(currentDate, new Date());

    // Get center coach IDs for filtering (center managers only)
    const centerCoachIds = useMemo(() => {
        if (isSupervisor() || !userData?.managedCenterId || !users || users.length === 0) return null;
        return users
            .filter(u => u.role === 'coach' && u.centerIds?.includes(userData.managedCenterId))
            .map(u => u.id);
    }, [users, userData?.managedCenterId, isSupervisor]);

    useEffect(() => {
        fetchUsers();
        fetchCenters();
    }, [fetchUsers, fetchCenters]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [trainingsData, plansData, groupsData] = await Promise.all([
                    getOrganizationTrainings(monthStart, monthEnd),
                    getAllMonthlyPlans(year, month),
                    getAllGroups()
                ]);

                if (!isSupervisor() && centerCoachIds) {
                    setTrainings(trainingsData.filter(t => centerCoachIds.includes(t.coachId)));
                    setPlans(plansData.filter(p => centerCoachIds.includes(p.coachId)));
                    setGroups(groupsData.filter(g => centerCoachIds.includes(g.coachId)));
                } else {
                    setTrainings(trainingsData);
                    setPlans(plansData);
                    setGroups(groupsData);
                }
            } catch (error) {
                console.error("Failed to fetch analytics data", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isSupervisor() || centerCoachIds !== null) {
            fetchData();
        }
    }, [currentDate, centerCoachIds, isSupervisor]);

    // Auto-expand the single center for center managers
    useEffect(() => {
        if (isCenterManager() && userData?.managedCenterId) {
            setExpandedExecution(prev => ({ ...prev, [userData.managedCenterId]: true }));
            setExpandedPlans(prev => ({ ...prev, [userData.managedCenterId]: true }));
        }
    }, [isCenterManager, userData?.managedCenterId]);

    // Build coach → center mapping from users
    const coachCenterMap = useMemo(() => {
        const map = {};
        if (!users) return map;
        users.filter(u => u.role === 'coach').forEach(u => {
            map[u.id] = {
                centerIds: u.centerIds || [],
                name: u.displayName || 'מאמן לא ידוע'
            };
        });
        return map;
    }, [users]);

    // Build group → center mapping
    const groupCenterMap = useMemo(() => {
        const map = {};
        groups.forEach(g => {
            map[g.id] = g.centerId;
        });
        return map;
    }, [groups]);

    // Build center name lookup
    const centerNameMap = useMemo(() => {
        const map = {};
        centers.forEach(c => { map[c.id] = c.name; });
        return map;
    }, [centers]);

    // Set of valid center IDs (real centers only)
    const validCenterIds = useMemo(() => new Set(centers.map(c => c.id)), [centers]);

    // Set of active coach IDs (coaches that exist and are active)
    const activeCoachIds = useMemo(() => {
        if (!users?.length) return new Set();
        return new Set(users.filter(u => u.role === 'coach' && u.isActive !== false).map(u => u.id));
    }, [users]);

    // Build valid group IDs set (active groups with an active coach, belonging to real centers)
    const validGroupIds = useMemo(() => {
        return new Set(
            groups.filter(g => g.isActive !== false && g.coachId && activeCoachIds.has(g.coachId) && validCenterIds.has(g.centerId)).map(g => g.id)
        );
    }, [groups, validCenterIds, activeCoachIds]);

    // Build group → coachId mapping
    const groupCoachMap = useMemo(() => {
        const map = {};
        groups.forEach(g => { map[g.id] = g.coachId; });
        return map;
    }, [groups]);

    // Only past trainings belonging to valid groups (matches supervisor dashboard)
    const pastValidTrainings = useMemo(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return trainings.filter(t => {
            const d = t.date?.toDate ? t.date.toDate() : t.date instanceof Date ? t.date : new Date(t.date);
            return d && d <= today && validGroupIds.has(t.groupId);
        });
    }, [trainings, validGroupIds]);

    // ── Training Execution stats by center → coach ──
    const executionData = useMemo(() => {
        const centerMap = {};

        pastValidTrainings.forEach(t => {
            const centerId = groupCenterMap[t.groupId];
            if (!centerId || !validCenterIds.has(centerId)) return;

            const coachId = t.coachId;
            if (!coachId) return;
            const coachInfo = coachCenterMap[coachId];
            if (!coachInfo) return; // skip unknown coaches

            if (!centerMap[centerId]) {
                centerMap[centerId] = { total: 0, completed: 0, coaches: {} };
            }
            centerMap[centerId].total += 1;
            if (t.status === 'completed') centerMap[centerId].completed += 1;

            if (!centerMap[centerId].coaches[coachId]) {
                centerMap[centerId].coaches[coachId] = {
                    id: coachId,
                    name: coachInfo.name,
                    total: 0,
                    completed: 0
                };
            }
            centerMap[centerId].coaches[coachId].total += 1;
            if (t.status === 'completed') centerMap[centerId].coaches[coachId].completed += 1;
        });

        return Object.entries(centerMap).map(([centerId, data]) => ({
            centerId,
            centerName: centerNameMap[centerId] || centerId,
            total: data.total,
            completed: data.completed,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
            coaches: Object.values(data.coaches).map(c => ({
                ...c,
                rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
            })).sort((a, b) => b.total - a.total)
        })).sort((a, b) => b.total - a.total);
    }, [pastValidTrainings, groupCenterMap, coachCenterMap, centerNameMap, validCenterIds]);

    // ── Plan Submission stats by center → coach (matches supervisorDashboardUtils pattern) ──
    const planData = useMemo(() => {
        const activeGroups = groups.filter(g => g.isActive !== false && validCenterIds.has(g.centerId));

        // Group active groups by center → coach
        const centerCoachGroups = {};
        activeGroups.forEach(g => {
            const centerId = g.centerId;
            const coachId = g.coachId;
            if (!coachId || !coachCenterMap[coachId]) return; // skip groups without known coach
            if (!centerCoachGroups[centerId]) centerCoachGroups[centerId] = {};
            if (!centerCoachGroups[centerId][coachId]) centerCoachGroups[centerId][coachId] = [];
            centerCoachGroups[centerId][coachId].push(g.id);
        });

        // Count submitted plans per group (derive coach from group, NOT from plan)
        return Object.entries(centerCoachGroups).map(([centerId, coachesByGroup]) => {
            let totalGroups = 0;
            let submittedPlans = 0;
            const coaches = [];

            Object.entries(coachesByGroup).forEach(([coachId, groupIds]) => {
                const coachInfo = coachCenterMap[coachId];
                let coachSubmitted = 0;

                groupIds.forEach(groupId => {
                    totalGroups += 1;
                    const plan = plans.find(p => p.groupId === groupId);
                    if (plan && ['submitted', 'approved', 'reviewed'].includes(plan.status)) {
                        submittedPlans += 1;
                        coachSubmitted += 1;
                    }
                });

                coaches.push({
                    id: coachId,
                    name: coachInfo?.name || 'מאמן',
                    totalGroups: groupIds.length,
                    submitted: coachSubmitted,
                    rate: groupIds.length > 0 ? Math.round((coachSubmitted / groupIds.length) * 100) : 0
                });
            });

            return {
                centerId,
                centerName: centerNameMap[centerId] || centerId,
                totalGroups,
                submittedPlans,
                rate: totalGroups > 0 ? Math.round((submittedPlans / totalGroups) * 100) : 0,
                coaches: coaches.sort((a, b) => b.totalGroups - a.totalGroups)
            };
        }).filter(c => c.totalGroups > 0).sort((a, b) => b.totalGroups - a.totalGroups);
    }, [plans, groups, coachCenterMap, centerNameMap, validCenterIds]);

    // Overall stats (uses pastValidTrainings — matches supervisor dashboard)
    const overallStats = useMemo(() => {
        const totalTrainings = pastValidTrainings.length;
        const completedTrainings = pastValidTrainings.filter(t => t.status === 'completed').length;
        const executionRate = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0;

        const activeGroups = groups.filter(g => g.isActive !== false && validCenterIds.has(g.centerId) && g.coachId && coachCenterMap[g.coachId]);
        const totalGroups = activeGroups.length;

        // Count submitted plans per group (matching planData filter — only groups with known coaches)
        let submittedPlans = 0;
        activeGroups.forEach(g => {
            const plan = plans.find(p => p.groupId === g.id);
            if (plan && ['submitted', 'approved', 'reviewed'].includes(plan.status)) {
                submittedPlans += 1;
            }
        });
        const planRate = totalGroups > 0 ? Math.round((submittedPlans / totalGroups) * 100) : 0;

        // Only count coaches that have at least one active assigned group
        const totalCoaches = users?.filter(u => u.role === 'coach' && u.isActive !== false && activeGroups.some(g => g.coachId === u.id)).length || 0;

        return { totalTrainings, completedTrainings, executionRate, totalGroups, submittedPlans, planRate, totalCoaches };
    }, [pastValidTrainings, plans, groups, users, validCenterIds, coachCenterMap]);


    // ── Bar chart data ──
    const coachesPerCenter = useMemo(() => {
        if (!centers.length || !users?.length || !groups.length) return [];
        const assignedGroups = groups.filter(g => g.isActive !== false && g.coachId && activeCoachIds.has(g.coachId));
        return centers.map(c => {
            // Only count coaches that have at least one active assigned group in this center
            const count = users.filter(u =>
                u.role === 'coach' && u.isActive !== false && u.centerIds?.includes(c.id) &&
                assignedGroups.some(g => g.coachId === u.id)
            ).length;
            return { name: c.name, count };
        }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
    }, [centers, users, groups, activeCoachIds]);

    const groupsPerCenter = useMemo(() => {
        if (!centers.length || !groups.length) return [];
        return centers.map(c => {
            const count = groups.filter(g => g.centerId === c.id && g.isActive !== false && g.coachId && activeCoachIds.has(g.coachId)).length;
            return { name: c.name, count };
        }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
    }, [centers, groups, activeCoachIds]);

    // ── Center Manager detail lists ──
    const coachDetailsList = useMemo(() => {
        if (!isCenterManager() || !users?.length || !centerCoachIds) return [];
        const coaches = users.filter(u => u.role === 'coach' && u.isActive !== false && centerCoachIds.includes(u.id));
        return coaches.map(coach => {
            const coachGroups = groups.filter(g => g.coachId === coach.id && g.isActive !== false);
            const coachTrainings = pastValidTrainings.filter(t => t.coachId === coach.id);
            const completed = coachTrainings.filter(t => t.status === 'completed').length;
            const coachPlans = plans.filter(p => coachGroups.some(g => g.id === p.groupId) && ['submitted', 'approved', 'reviewed'].includes(p.status));
            return {
                id: coach.id,
                name: coach.name || coach.displayName,
                groupCount: coachGroups.length,
                execRate: coachTrainings.length > 0 ? Math.round((completed / coachTrainings.length) * 100) : 0,
                planCount: coachPlans.length,
                totalTrainings: coachTrainings.length,
                completedTrainings: completed,
            };
        }).sort((a, b) => b.groupCount - a.groupCount);
    }, [isCenterManager, users, centerCoachIds, groups, pastValidTrainings, plans]);

    const groupDetailsList = useMemo(() => {
        if (!isCenterManager() || !groups?.length || !centerCoachIds) return [];
        const cmGroups = groups.filter(g => g.isActive !== false && g.coachId && centerCoachIds.includes(g.coachId));
        return cmGroups.map(group => {
            const coach = users?.find(u => u.id === group.coachId);
            const plan = plans.find(p => p.groupId === group.id);
            const planStatus = plan ? (['submitted', 'approved', 'reviewed'].includes(plan.status) ? 'הוגשה' : 'טיוטה') : 'חסרה';
            return {
                id: group.id,
                name: group.name,
                coachName: coach?.name || coach?.displayName || 'לא משויך',
                playerCount: group.players?.length || 0,
                planStatus,
            };
        }).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }, [isCenterManager, groups, centerCoachIds, users, plans]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const toggleExecution = (centerId) => {
        setExpandedExecution(prev => ({ ...prev, [centerId]: !prev[centerId] }));
    };

    const togglePlans = (centerId) => {
        setExpandedPlans(prev => ({ ...prev, [centerId]: !prev[centerId] }));
    };

    const getRateColor = (rate) => {
        if (rate >= 80) return 'var(--success-500, #4caf50)';
        if (rate >= 50) return 'var(--warning-500, #ff9800)';
        return 'var(--error-500, #f44336)';
    };

    const getRateBg = (rate) => {
        if (rate >= 80) return 'var(--success-100, #e8f5e9)';
        if (rate >= 50) return 'var(--warning-100, #fff3e0)';
        return 'var(--error-100, #ffebee)';
    };

    if (isLoading) return <Spinner.FullPage />;

    return (
        <div className={styles.page}>
            {/* Page Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>נתונים</h1>
                <p className={styles.subtitle}>
                    {isCenterManager() ? 'סקירה חודשית של ביצוע ותוכניות במרכז שלך' : 'סקירה חודשית של ביצוע ותוכניות בכל המרכזים'}
                </p>
            </div>

            <div className={styles.monthSelector}>
                <button onClick={handlePrevMonth} className={styles.navButton}>
                    <ChevronRight size={20} />
                </button>
                <span className={`${styles.monthTitle} ${isCurrentMonth ? styles.monthTitleCurrent : ''}`}>
                    {format(currentDate, 'MMMM yyyy', { locale: he })}
                </span>
                <button onClick={handleNextMonth} className={styles.navButton}>
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Summary Stats */}
            <div className={styles.pageSectionHeader}>
                <BarChart2 size={18} className={styles.pageSectionIcon} />
                <h2 className={styles.pageSectionTitle}>סיכום נתונים</h2>
            </div>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <Users size={18} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.totalCoaches}</div>
                        <div className={styles.statLabel}>מאמנים</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--accent-100)', color: 'var(--accent-700)' }}>
                        <Users size={18} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.totalGroups}</div>
                        <div className={styles.statLabel}>קבוצות</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <BarChart3 size={18} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.totalTrainings}</div>
                        <div className={styles.statLabel}>אימונים תוכננו</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: getRateBg(overallStats.executionRate), color: getRateColor(overallStats.executionRate) }}>
                        <CheckCircle size={18} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.executionRate}%</div>
                        <div className={styles.statLabel}>אחוז ביצוע</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--accent-100)', color: 'var(--accent-700)' }}>
                        <FileText size={18} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.submittedPlans}/{overallStats.totalGroups}</div>
                        <div className={styles.statLabel}>תוכניות הוגשו</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: getRateBg(overallStats.planRate), color: getRateColor(overallStats.planRate) }}>
                        {overallStats.planRate >= 80 ? <TrendingUp size={18} className={styles.rtlIcon} /> : <TrendingDown size={18} className={styles.rtlIcon} />}
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.planRate}%</div>
                        <div className={styles.statLabel}>אחוז הגשה</div>
                    </div>
                </div>
            </div>

            {/* Alerts removed per user request */}

            {/* ── Section 1: Training Execution ── */}
            <div className={styles.pageSectionHeader}>
                <CheckCircle size={18} className={styles.pageSectionIcon} />
                <h2 className={styles.pageSectionTitle}>ביצוע אימונים</h2>
            </div>
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleRow}>
                        <CheckCircle size={18} className={styles.sectionIcon} />
                        <h2 className={styles.sectionTitle}>ביצוע אימונים</h2>
                    </div>
                    <span className={styles.sectionBadge}>{overallStats.executionRate}%</span>
                </div>

                {executionData.length === 0 ? (
                    <div className={styles.emptyState}>אין נתוני אימונים לחודש זה</div>
                ) : (
                    <div className={styles.centerList}>
                        {executionData.map(center => (
                            <div key={center.centerId} className={styles.centerCard}>
                                <div
                                    className={styles.centerRow}
                                    onClick={() => toggleExecution(center.centerId)}
                                >
                                    <div className={styles.centerInfo}>
                                        <Building2 size={16} className={styles.centerIcon} />
                                        <span className={styles.centerName}>{center.centerName}</span>
                                        <span className={styles.centerMeta}>{center.coaches.length} מאמנים</span>
                                    </div>
                                    <div className={styles.centerStats}>
                                        <span className={styles.centerNumbers}>{center.completed}/{center.total}</span>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${center.rate}%`, backgroundColor: getRateColor(center.rate) }}
                                            />
                                        </div>
                                        <span className={styles.rateValue} style={{ color: getRateColor(center.rate) }}>
                                            {center.rate}%
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`${styles.expandIcon} ${expandedExecution[center.centerId] ? styles.expandIconOpen : ''}`}
                                        />
                                    </div>
                                </div>

                                {expandedExecution[center.centerId] && (
                                    <div className={styles.coachList}>
                                        {center.coaches.map(coach => (
                                            <div
                                                key={coach.id}
                                                className={styles.coachRow}
                                                onClick={() => setSelectedCoach(coach)}
                                            >
                                                <div className={styles.coachInfo}>
                                                    <Avatar name={coach.name} size="small" />
                                                    <span className={styles.coachName}>{coach.name}</span>
                                                </div>
                                                <div className={styles.coachStats}>
                                                    <span className={styles.coachNumbers}>{coach.completed}/{coach.total}</span>
                                                    <div className={styles.progressBarSmall}>
                                                        <div
                                                            className={styles.progressFill}
                                                            style={{ width: `${coach.rate}%`, backgroundColor: getRateColor(coach.rate) }}
                                                        />
                                                    </div>
                                                    <span className={styles.coachRate} style={{ color: getRateColor(coach.rate) }}>
                                                        {coach.rate}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Section 2: Plan Submission ── */}
            <div className={styles.pageSectionHeader}>
                <FileText size={18} className={styles.pageSectionIcon} />
                <h2 className={styles.pageSectionTitle}>הגשת תוכניות חודשיות</h2>
            </div>
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleRow}>
                        <FileText size={18} className={styles.sectionIcon} />
                        <h2 className={styles.sectionTitle}>הגשת תוכניות חודשיות</h2>
                    </div>
                    <span className={styles.sectionBadge}>{overallStats.planRate}%</span>
                </div>

                {planData.length === 0 ? (
                    <div className={styles.emptyState}>אין נתוני תוכניות לחודש זה</div>
                ) : (
                    <div className={styles.centerList}>
                        {planData.map(center => (
                            <div key={center.centerId} className={styles.centerCard}>
                                <div
                                    className={styles.centerRow}
                                    onClick={() => togglePlans(center.centerId)}
                                >
                                    <div className={styles.centerInfo}>
                                        <Building2 size={16} className={styles.centerIcon} />
                                        <span className={styles.centerName}>{center.centerName}</span>
                                        <span className={styles.centerMeta}>{center.coaches.length} מאמנים</span>
                                    </div>
                                    <div className={styles.centerStats}>
                                        <span className={styles.centerNumbers}>{center.submittedPlans}/{center.totalGroups}</span>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${center.rate}%`, backgroundColor: getRateColor(center.rate) }}
                                            />
                                        </div>
                                        <span className={styles.rateValue} style={{ color: getRateColor(center.rate) }}>
                                            {center.rate}%
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`${styles.expandIcon} ${expandedPlans[center.centerId] ? styles.expandIconOpen : ''}`}
                                        />
                                    </div>
                                </div>

                                {expandedPlans[center.centerId] && (
                                    <div className={styles.coachList}>
                                        {center.coaches.map(coach => (
                                            <div key={coach.id} className={styles.coachRow}>
                                                <div className={styles.coachInfo}>
                                                    <Avatar name={coach.name} size="small" />
                                                    <span className={styles.coachName}>{coach.name}</span>
                                                </div>
                                                <div className={styles.coachStats}>
                                                    <span className={styles.coachNumbers}>{coach.submitted}/{coach.totalGroups}</span>
                                                    <div className={styles.progressBarSmall}>
                                                        <div
                                                            className={styles.progressFill}
                                                            style={{ width: `${coach.rate}%`, backgroundColor: getRateColor(coach.rate) }}
                                                        />
                                                    </div>
                                                    <span className={styles.coachRate} style={{ color: getRateColor(coach.rate) }}>
                                                        {coach.rate}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Bar Charts (supervisor) / Detail Lists (center manager) ── */}
            {isCenterManager() ? (
                <>
                    {coachDetailsList.length > 0 && (
                        <>
                        <div className={styles.pageSectionHeader}>
                            <Users size={18} className={styles.pageSectionIcon} />
                            <h2 className={styles.pageSectionTitle}>מאמנים במרכז</h2>
                        </div>
                        <div className={styles.detailList}>
                            {coachDetailsList.map(coach => (
                                <div key={coach.id} className={styles.detailListItem} onClick={() => setSelectedCoach(coach)}>
                                    <div className={styles.detailListAvatar}>{coach.name?.charAt(0)}</div>
                                    <div className={styles.detailListInfo}>
                                        <div className={styles.detailListName}>{coach.name}</div>
                                        <div className={styles.detailListMeta}>{coach.groupCount} קבוצות · ביצוע {coach.execRate}% · תוכניות {coach.planCount}/{coach.groupCount}</div>
                                    </div>
                                    <div className={styles.detailListRate} style={{ backgroundColor: getRateColor(coach.execRate) + '20', color: getRateColor(coach.execRate) }}>{coach.execRate}%</div>
                                    <ChevronLeft size={16} className={styles.detailListChevron} />
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                    {groupDetailsList.length > 0 && (
                        <>
                        <div className={styles.pageSectionHeader}>
                            <Users size={18} className={styles.pageSectionIcon} />
                            <h2 className={styles.pageSectionTitle}>קבוצות במרכז</h2>
                        </div>
                        <div className={styles.detailList}>
                            {groupDetailsList.map(group => (
                                <div key={group.id} className={styles.detailListItem}>
                                    <div className={styles.detailListInfo}>
                                        <div className={styles.detailListName}>{group.name}</div>
                                        <div className={styles.detailListMeta}>{group.coachName} · {group.playerCount} שחקנים · תוכנית: {group.planStatus}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                </>
            ) : (coachesPerCenter.length > 0 || groupsPerCenter.length > 0) && (
                <>
                <div className={styles.pageSectionHeader}>
                    <Building2 size={18} className={styles.pageSectionIcon} />
                    <h2 className={styles.pageSectionTitle}>נתונים לפי מרכז</h2>
                </div>
                <div className={styles.chartsGrid}>
                    {coachesPerCenter.length > 0 && (
                        <HorizontalBarChart
                            data={coachesPerCenter}
                            color="var(--primary-500)"
                            label="מאמנים לפי מרכז"
                            icon={Users}
                        />
                    )}
                    {groupsPerCenter.length > 0 && (
                        <HorizontalBarChart
                            data={groupsPerCenter}
                            color="var(--accent-600)"
                            label="קבוצות לפי מרכז"
                            icon={Users}
                        />
                    )}
                </div>
                </>
            )}

            <CoachTrainingsModal
                isOpen={!!selectedCoach}
                coach={selectedCoach}
                trainings={trainings}
                onClose={() => setSelectedCoach(null)}
            />
        </div>
    );
};

export default ManagerAnalyticsDashboard;
