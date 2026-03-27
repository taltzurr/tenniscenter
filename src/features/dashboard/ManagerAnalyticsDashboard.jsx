import { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BarChart2,
    CheckCircle,
    FileText,
    TrendingUp,
    TrendingDown,
    Building2
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
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

    // ── Training Execution stats by center → coach ──
    const executionData = useMemo(() => {
        const centerMap = {};

        trainings.forEach(t => {
            const coachId = t.coachId || 'unknown';
            const coachInfo = coachCenterMap[coachId];
            const centerId = coachInfo?.centerIds?.[0] || 'unknown';

            if (!centerMap[centerId]) {
                centerMap[centerId] = { total: 0, completed: 0, coaches: {} };
            }
            centerMap[centerId].total += 1;
            if (t.status === 'completed') centerMap[centerId].completed += 1;

            if (!centerMap[centerId].coaches[coachId]) {
                centerMap[centerId].coaches[coachId] = {
                    id: coachId,
                    name: coachInfo?.name || t.coachName || 'מאמן לא ידוע',
                    total: 0,
                    completed: 0
                };
            }
            centerMap[centerId].coaches[coachId].total += 1;
            if (t.status === 'completed') centerMap[centerId].coaches[coachId].completed += 1;
        });

        return Object.entries(centerMap).map(([centerId, data]) => ({
            centerId,
            centerName: centerNameMap[centerId] || 'מרכז לא ידוע',
            total: data.total,
            completed: data.completed,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
            coaches: Object.values(data.coaches).map(c => ({
                ...c,
                rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
            })).sort((a, b) => b.total - a.total)
        })).sort((a, b) => b.total - a.total);
    }, [trainings, coachCenterMap, centerNameMap]);

    // ── Plan Submission stats by center → coach ──
    const planData = useMemo(() => {
        // Count groups per coach per center
        const centerGroupCounts = {};
        groups.forEach(g => {
            const centerId = g.centerId || 'unknown';
            const coachId = g.coachId || 'unknown';
            if (!centerGroupCounts[centerId]) centerGroupCounts[centerId] = {};
            if (!centerGroupCounts[centerId][coachId]) centerGroupCounts[centerId][coachId] = 0;
            centerGroupCounts[centerId][coachId] += 1;
        });

        // Count submitted plans (anything beyond draft) per coach per center
        const centerPlanCounts = {};
        plans.forEach(p => {
            const coachId = p.coachId || 'unknown';
            const groupCenterId = groupCenterMap[p.groupId];
            const coachInfo = coachCenterMap[coachId];
            const centerId = groupCenterId || coachInfo?.centerIds?.[0] || 'unknown';

            if (!centerPlanCounts[centerId]) centerPlanCounts[centerId] = {};
            if (!centerPlanCounts[centerId][coachId]) centerPlanCounts[centerId][coachId] = 0;
            if (p.status !== 'draft') {
                centerPlanCounts[centerId][coachId] += 1;
            }
        });

        // Merge into center-level data
        const allCenterIds = new Set([
            ...Object.keys(centerGroupCounts),
            ...Object.keys(centerPlanCounts)
        ]);

        return Array.from(allCenterIds).map(centerId => {
            const groupsByCoachs = centerGroupCounts[centerId] || {};
            const plansByCoach = centerPlanCounts[centerId] || {};
            const allCoachIds = new Set([...Object.keys(groupsByCoachs), ...Object.keys(plansByCoach)]);

            let totalGroups = 0;
            let submittedPlans = 0;
            const coaches = [];

            allCoachIds.forEach(coachId => {
                const coachGroups = groupsByCoachs[coachId] || 0;
                const coachSubmitted = plansByCoach[coachId] || 0;
                totalGroups += coachGroups;
                submittedPlans += coachSubmitted;

                const coachInfo = coachCenterMap[coachId];
                coaches.push({
                    id: coachId,
                    name: coachInfo?.name || 'מאמן לא ידוע',
                    totalGroups: coachGroups,
                    submitted: coachSubmitted,
                    rate: coachGroups > 0 ? Math.round((coachSubmitted / coachGroups) * 100) : 0
                });
            });

            return {
                centerId,
                centerName: centerNameMap[centerId] || 'מרכז לא ידוע',
                totalGroups,
                submittedPlans,
                rate: totalGroups > 0 ? Math.round((submittedPlans / totalGroups) * 100) : 0,
                coaches: coaches.sort((a, b) => b.totalGroups - a.totalGroups)
            };
        }).filter(c => c.totalGroups > 0).sort((a, b) => b.totalGroups - a.totalGroups);
    }, [plans, groups, groupCenterMap, coachCenterMap, centerNameMap]);

    // Overall stats
    const overallStats = useMemo(() => {
        const totalTrainings = trainings.length;
        const completedTrainings = trainings.filter(t => t.status === 'completed').length;
        const executionRate = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0;

        const totalGroups = groups.length;
        const submittedPlans = plans.filter(p => p.status !== 'draft').length;
        const planRate = totalGroups > 0 ? Math.round((submittedPlans / totalGroups) * 100) : 0;

        return { totalTrainings, completedTrainings, executionRate, totalGroups, submittedPlans, planRate };
    }, [trainings, plans, groups]);

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
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>דאשבורד פיקוח ובקרה</h1>
                    <p className={styles.subtitle}>
                        {isCenterManager() ? 'סקירה חודשית של ביצוע ותוכניות במרכז שלך' : 'סקירה חודשית של ביצוע ותוכניות בכל המרכזים'}
                    </p>
                </div>

                <div className={styles.monthSelector}>
                    <button onClick={handlePrevMonth} className={styles.navButton}>
                        <ChevronRight size={20} />
                    </button>
                    <span className={styles.monthTitle}>
                        {format(currentDate, 'MMMM yyyy', { locale: he })}
                    </span>
                    <button onClick={handleNextMonth} className={styles.navButton}>
                        <ChevronLeft size={20} />
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <BarChart2 size={18} />
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
                        {overallStats.planRate >= 80 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{overallStats.planRate}%</div>
                        <div className={styles.statLabel}>אחוז הגשה</div>
                    </div>
                </div>
            </div>

            {/* ── Section 1: Training Execution ── */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <CheckCircle size={18} />
                    <h2 className={styles.sectionTitle}>ביצוע אימונים</h2>
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
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <FileText size={18} />
                    <h2 className={styles.sectionTitle}>הגשת תוכניות חודשיות</h2>
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
