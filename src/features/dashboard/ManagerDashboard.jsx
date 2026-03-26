import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Building2, Calendar, BarChart2, Trophy, Heart, Target,
  ShieldCheck, AlertTriangle, CheckCircle, Clock, FileText, TrendingUp,
  CalendarDays, Info, ArrowUp, ArrowDown, ChevronDown, X
} from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../stores/authStore';
import useUsersStore from '../../stores/usersStore';
import useGroupsStore from '../../stores/groupsStore';
import useMonthlyPlansStore from '../../stores/monthlyPlansStore';
import useCentersStore from '../../stores/centersStore';
import useEventsStore from '../../stores/eventsStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import { getOrganizationTrainings } from '../../services/trainings';
import { getStatusColor } from './utils/centerDashboardUtils';
import {
  getOrgQuickStats,
  getAlerts,
  getTodayTrainingsByCenter,
  getCenterComparison,
  getPlanSubmissionStatus,
  getTopBottomCoaches,
  getTrainingExecutionData,
  getPlanSubmissionData,
  getCoachesListByCenter,
  getTodayTrainingsDetail
} from './utils/supervisorDashboardUtils';
import { DEFAULT_GROUP_TYPES } from '../../config/constants';
import { getGreeting } from '../../utils/greeting';
import Spinner from '../../components/ui/Spinner/Spinner';
import MonthlyOutstandingCard from './MonthlyOutstandingCard';
import styles from './ManagerDashboard.module.css';

// ── Pie Chart SVG ──
const PieChart = ({ segments, size = 120, strokeWidth = 24, centerText, centerColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let accumulated = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.pieChartSvg}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const offset = circumference * (1 - accumulated);
        const dash = circumference * seg.value;
        accumulated += seg.value;
        return (
          <circle key={i} cx={center} cy={center} r={radius} fill="none"
            stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        );
      })}
      {centerText && (
        <text x={center} y={center} textAnchor="middle" dominantBaseline="central"
          fontSize="20" fontWeight="800" fill={centerColor || '#1f2937'}>
          {centerText}
        </text>
      )}
    </svg>
  );
};

// ── Detail Modal ──
const DetailModal = ({ isOpen, onClose, title, icon: Icon, children }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{Icon && <Icon size={20} />}{title}</div>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { userData, isSupervisor } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  const { groups, fetchGroups } = useGroupsStore();
  const { plans: monthlyPlans, fetchAllPlans } = useMonthlyPlansStore();
  const { centers, fetchCenters } = useCentersStore();
  const { events, fetchEvents } = useEventsStore();
  const { fetchTheme, currentTheme } = useMonthlyThemesStore();

  const [orgTrainings, setOrgTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllCenters, setShowAllCenters] = useState(false);
  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllBottom, setShowAllBottom] = useState(false);
  const [trainingModal, setTrainingModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [statModal, setStatModal] = useState(null); // 'coaches' | 'todayTrainings'
  const [selectedCenter, setSelectedCenter] = useState(null); // center object from centerComparison
  const [expandedCenterId, setExpandedCenterId] = useState(null); // for center table drill-down

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        await Promise.all([
          fetchUsers(),
          fetchGroups(null, true),
          fetchCenters(),
          fetchAllPlans(currentYear, currentMonth),
          fetchEvents(currentYear, currentDate.getMonth()),
          fetchTheme(currentYear, currentDate.getMonth())
        ]);
        const trainings = await getOrganizationTrainings(monthStart, monthEnd);
        setOrgTrainings(trainings);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchUsers, fetchGroups, fetchCenters, fetchAllPlans, fetchEvents, fetchTheme, currentYear, currentMonth]);

  // ── Computed Data ──
  const quickStats = useMemo(() => {
    if (!users.length || !centers.length) return null;
    return getOrgQuickStats(users, orgTrainings, monthlyPlans, groups, events, centers, currentYear, currentMonth);
  }, [users, orgTrainings, monthlyPlans, groups, events, centers, currentYear, currentMonth]);

  const alerts = useMemo(() => {
    if (!users.length) return [];
    return getAlerts(users, orgTrainings, monthlyPlans, groups, events, centers, currentYear, currentMonth);
  }, [users, orgTrainings, monthlyPlans, groups, events, centers, currentYear, currentMonth]);

  const todayByCenter = useMemo(() =>
    getTodayTrainingsByCenter(orgTrainings, groups, users, centers),
    [orgTrainings, groups, users, centers]);

  const centerComparison = useMemo(() => {
    if (!centers.length) return [];
    return getCenterComparison(users, orgTrainings, monthlyPlans, groups, centers, currentYear, currentMonth);
  }, [users, orgTrainings, monthlyPlans, groups, centers, currentYear, currentMonth]);

  const activeCenters = useMemo(() => centerComparison.filter(c => c.hasActivity), [centerComparison]);
  const inactiveCenters = useMemo(() => centerComparison.filter(c => !c.hasActivity), [centerComparison]);

  const planStatus = useMemo(() =>
    getPlanSubmissionStatus(users, monthlyPlans, groups, centers, currentYear, currentMonth),
    [users, monthlyPlans, groups, centers, currentYear, currentMonth]);

  const topBottom = useMemo(() =>
    getTopBottomCoaches(users, orgTrainings, groups, centers),
    [users, orgTrainings, groups, centers]);

  const trainingExec = useMemo(() =>
    getTrainingExecutionData(orgTrainings, groups, users, centers),
    [orgTrainings, groups, users, centers]);

  const planData = useMemo(() =>
    getPlanSubmissionData(users, monthlyPlans, groups, centers, currentYear, currentMonth),
    [users, monthlyPlans, groups, centers, currentYear, currentMonth]);

  // Stat card detail data
  const coachesByCenter = useMemo(() =>
    getCoachesListByCenter(users, centers),
    [users, centers]);

  const todayTrainingsDetail = useMemo(() =>
    getTodayTrainingsDetail(orgTrainings, groups, users, centers),
    [orgTrainings, groups, users, centers]);

  // Group today's trainings by center
  const todayTrainingsByCenterGrouped = useMemo(() => {
    const map = {};
    todayTrainingsDetail.forEach(t => {
      const key = t.centerName || 'ללא מרכז';
      if (!map[key]) map[key] = { centerName: key, trainings: [], completed: 0, notCompleted: 0 };
      map[key].trainings.push(t);
      if (t.status === 'completed') map[key].completed++;
      else map[key].notCompleted++;
    });
    return Object.values(map).sort((a, b) => b.trainings.length - a.trainings.length);
  }, [todayTrainingsDetail]);

  // Monthly goals & values
  const monthlyValues = useMemo(() => {
    if (currentTheme?.values?.length > 0) return currentTheme.values.map((val, i) => ({ id: `v-${i}`, name: val }));
    return [];
  }, [currentTheme]);

  const monthlyGoalsByGroup = useMemo(() => {
    const goals = currentTheme?.goals;
    if (!goals || Array.isArray(goals)) return {};
    return goals;
  }, [currentTheme]);

  const monthlyGoalsArray = useMemo(() => {
    const goals = currentTheme?.goals;
    if (!goals || !Array.isArray(goals)) return [];
    return goals.map((g, i) => ({ id: `g-${i}`, name: g }));
  }, [currentTheme]);

  const dashboardItems = useMemo(() => [
    { title: 'ניהול משתמשים', description: 'צפייה, הוספה ועריכה של משתמשים, מאמנים ומנהלים.', icon: Users, color: 'blue', path: '/users' },
    ...(isSupervisor() ? [{ title: 'ניהול מרכזים', description: 'הגדרת מרכזים, כתובות ופרטי התקשרות.', icon: Building2, color: 'green', path: '/centers' }] : []),
    { title: 'פיקוח ובקרה', description: 'דוחות ביצוע, סטטיסטיקות מאמנים ומעקב.', icon: BarChart2, color: 'orange', path: '/analytics' },
    { title: 'מטרות וערכים', description: 'מטרות חודשיות, ערכים ואירועים ארגוניים.', icon: Calendar, color: 'purple', path: '/events-calendar' },
    { title: 'מצטייני החודש', description: 'בחירת מאמנים ומרכזים מצטיינים.', icon: Trophy, color: 'yellow', path: '/monthly-outstanding' }
  ], [isSupervisor]);

  const alertIconMap = { danger: AlertTriangle, warning: AlertTriangle, info: Info };
  const monthName = format(currentDate, 'MMMM', { locale: he });

  // ── Brand Colors for Charts (from logo palette) ──
  const CHART_COLORS = {
    completed: '#3d7db5',    // primary-600 (blue)
    notCompleted: '#d4b82e', // accent-600 (gold)
    cancelled: '#f44336',    // error-500 (red)
    submitted: '#1e5680',    // primary-800 (dark blue)
    draft: '#8dc7e8',        // primary-300 (light blue)
    missing: '#e0e0e0',      // gray-300
  };

  // Pie chart segments
  const trainingPieSegments = useMemo(() => {
    if (trainingExec.total === 0) return [];
    return [
      { value: trainingExec.completed / trainingExec.total, color: CHART_COLORS.completed },
      { value: trainingExec.notCompleted / trainingExec.total, color: CHART_COLORS.notCompleted },
      ...(trainingExec.cancelled > 0 ? [{ value: trainingExec.cancelled / trainingExec.total, color: CHART_COLORS.cancelled }] : [])
    ];
  }, [trainingExec]);

  const planPieSegments = useMemo(() => {
    if (planData.total === 0) return [];
    return [
      { value: planData.submitted / planData.total, color: CHART_COLORS.submitted },
      { value: planData.draft / planData.total, color: CHART_COLORS.draft },
      { value: planData.missing / planData.total, color: CHART_COLORS.missing }
    ];
  }, [planData]);

  if (loading) {
    return <div className={styles.loadingContainer}><Spinner /></div>;
  }

  const statusBadge = (status) => {
    const map = { completed: 'בוצע', planned: 'מתוכנן', cancelled: 'בוטל', draft: 'טיוטה' };
    const colorMap = { completed: '#3d7db5', planned: '#4a9fd4', cancelled: '#f44336', draft: '#9ca3af' };
    return (
      <span style={{ fontSize: '11px', fontWeight: 600, color: colorMap[status] || '#6b7280', backgroundColor: (colorMap[status] || '#6b7280') + '15', padding: '2px 8px', borderRadius: '12px' }}>
        {map[status] || status}
      </span>
    );
  };

  return (
    <div className={styles.page}>
      {/* ── Greeting ── */}
      <div className={styles.greeting}>
        <h1 className={styles.greetingTitle}>
          {getGreeting()}, {(userData?.displayName || 'מנהל').split(' ')[0]}!
        </h1>
        <p className={styles.greetingSubtitle}>
          {format(currentDate, 'EEEE, d בMMMM yyyy', { locale: he })}
        </p>
      </div>

      {/* ═══ Quick Stats - ALL CLICKABLE ═══ */}
      {quickStats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard} onClick={() => setStatModal('coaches')}>
            <div className={`${styles.statIcon} ${styles.blue}`}><Users size={18} /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{quickStats.totalCoaches}</div>
              <div className={styles.statLabel}>מאמנים פעילים</div>
            </div>
          </div>
          <div className={styles.statCard} onClick={() => setStatModal('todayTrainings')}>
            <div className={`${styles.statIcon} ${styles.orange}`}><Clock size={18} /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{quickStats.todaysTrainings}</div>
              <div className={styles.statLabel}>אימונים היום</div>
            </div>
          </div>
          <div className={styles.statCard} onClick={() => setTrainingModal(true)}>
            <div className={`${styles.statIcon} ${styles.green}`}><TrendingUp size={18} /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{quickStats.completionRate}%</div>
              <div className={styles.statLabel}>ביצוע חודשי</div>
            </div>
          </div>
          <div className={styles.statCard} onClick={() => navigate('/events-calendar#calendar')}>
            <div className={`${styles.statIcon} ${styles.yellow}`}><CalendarDays size={18} /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{quickStats.upcomingEvents}</div>
              <div className={styles.statLabel}>אירועים החודש</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section: מצב נוכחי ═══ */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionDividerText}>מצב נוכחי</span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><AlertTriangle size={18} /> התראות</h2>
          </div>
          <div className={styles.alertsList}>
            {alerts.map((alert, i) => {
              const AlertIcon = alertIconMap[alert.type] || Info;
              return (
                <div key={i} className={`${styles.alertItem} ${styles[alert.type]}`}>
                  <AlertIcon size={16} className={`${styles.alertIcon} ${styles[alert.type]}`} />
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitle}>{alert.title}</div>
                    {alert.details && <div className={styles.alertDetails}>{alert.details}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {alerts.length === 0 && (
        <div className={styles.section}>
          <div className={styles.noAlerts}><CheckCircle size={18} /> הכל תקין - אין התראות</div>
        </div>
      )}

      {/* Today's Trainings by Center */}
      {todayByCenter.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><Clock size={18} /> אימונים היום לפי מרכז</h2>
          </div>
          <div className={styles.centerTrainingsList}>
            {todayByCenter.map(c => (
              <div key={c.centerId} className={styles.centerTrainingRow}>
                <div className={styles.centerTrainingCount}>{c.total}</div>
                <div className={styles.centerTrainingName}>{c.centerName}</div>
                <div className={styles.centerTrainingMeta}>{c.completed} הושלמו · {c.pending} נותרו</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Section: ביצועים חודשיים ═══ */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionDividerText}>ביצועים חודשיים</span>
      </div>

      {/* ═══ Pie Charts ═══ */}
      <div className={styles.pieChartsGrid}>
        <div className={styles.pieChartCard} onClick={() => setTrainingModal(true)}>
          <div className={styles.pieChartHeader}>
            <div className={styles.pieChartTitle}><BarChart2 size={18} /> ביצוע אימונים - {monthName}</div>
            <span className={styles.pieChartHint}>לחץ לפירוט</span>
          </div>
          <div className={styles.pieChartSubtitle}>{trainingExec.total} אימונים שתאריכם עבר | {trainingExec.completed} בוצעו ({trainingExec.rate}%)</div>
          {trainingExec.total > 0 ? (
            <div className={styles.pieChartContent}>
              <PieChart segments={trainingPieSegments} centerText={`${trainingExec.rate}%`} centerColor={CHART_COLORS.completed} />
              <div className={styles.pieChartLegend}>
                <div className={styles.legendItem}><div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS.completed }} /><span className={styles.legendLabel}>בוצעו</span><span className={styles.legendValue}>{trainingExec.completed}</span></div>
                <div className={styles.legendItem}><div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS.notCompleted }} /><span className={styles.legendLabel}>לא בוצעו</span><span className={styles.legendValue}>{trainingExec.notCompleted}</span></div>
                {trainingExec.cancelled > 0 && <div className={styles.legendItem}><div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS.cancelled }} /><span className={styles.legendLabel}>בוטלו</span><span className={styles.legendValue}>{trainingExec.cancelled}</span></div>}
              </div>
            </div>
          ) : <div className={styles.emptyState}>אין נתוני אימונים</div>}
        </div>
        <div className={styles.pieChartCard} onClick={() => setPlanModal(true)}>
          <div className={styles.pieChartHeader}>
            <div className={styles.pieChartTitle}><FileText size={18} /> הגשת תוכניות - {monthName}</div>
            <span className={styles.pieChartHint}>לחץ לפירוט</span>
          </div>
          <div className={styles.pieChartSubtitle}>{planData.total} קבוצות | {planData.submitted} הוגשו ({planData.rate}%)</div>
          {planData.total > 0 ? (
            <div className={styles.pieChartContent}>
              <PieChart segments={planPieSegments} centerText={`${planData.rate}%`} centerColor={CHART_COLORS.submitted} />
              <div className={styles.pieChartLegend}>
                <div className={styles.legendItem}><div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS.submitted }} /><span className={styles.legendLabel}>הוגשו</span><span className={styles.legendValue}>{planData.submitted}</span></div>
                <div className={styles.legendItem}><div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS.draft }} /><span className={styles.legendLabel}>טיוטה</span><span className={styles.legendValue}>{planData.draft}</span></div>
                <div className={styles.legendItem}><div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS.missing }} /><span className={styles.legendLabel}>חסרות</span><span className={styles.legendValue}>{planData.missing}</span></div>
              </div>
            </div>
          ) : <div className={styles.emptyState}>אין נתוני תוכניות</div>}
        </div>
      </div>

      {/* ═══ Center Comparison ═══ */}
      {activeCenters.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><Building2 size={18} /> השוואת מרכזים</h2>
            <Link to="/analytics" className={styles.sectionAction}>צפייה מפורטת</Link>
          </div>
          <div className={styles.comparisonGrid}>
            {activeCenters.map(center => {
              const sc = getStatusColor(center.completionRate);
              return (
                <div key={center.id} className={styles.comparisonRow} onClick={() => setSelectedCenter(center)} style={{ cursor: 'pointer' }}>
                  <div className={styles.comparisonCenter}>
                    <div className={styles.comparisonCenterName}>{center.name}</div>
                    <div className={styles.comparisonCenterMeta}>{center.coaches} מאמנים · {center.groups} קבוצות</div>
                  </div>
                  <div className={styles.comparisonBar}>
                    <div className={`${styles.comparisonBarFill} ${styles[sc]}`} style={{ width: `${center.completionRate}%` }} />
                  </div>
                  <div className={`${styles.comparisonRate} ${styles[sc]}`}>{center.completionRate}%</div>
                </div>
              );
            })}
            {showAllCenters && inactiveCenters.map(center => (
              <div key={center.id} className={styles.comparisonRow}>
                <div className={styles.comparisonCenter}>
                  <div className={styles.comparisonCenterName}>{center.name}</div>
                  <div className={styles.comparisonCenterMeta}>0 מאמנים · 0 קבוצות</div>
                </div>
                <div className={styles.comparisonBar}><div className={`${styles.comparisonBarFill} ${styles.danger}`} style={{ width: '0%' }} /></div>
                <div className={`${styles.comparisonRate} ${styles.danger}`}>0%</div>
              </div>
            ))}
          </div>
          {inactiveCenters.length > 0 && (
            <button className={styles.showMoreBtn} onClick={() => setShowAllCenters(!showAllCenters)}>
              <ChevronDown size={16} style={{ transform: showAllCenters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              {showAllCenters ? 'הסתר מרכזים ריקים' : `הצג ${inactiveCenters.length} מרכזים נוספים`}
            </button>
          )}
        </div>
      )}

      {/* ═══ Section: מאמנים ותוכניות ═══ */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionDividerText}>מאמנים ותוכניות</span>
      </div>

      {/* ═══ Center Performance Table ═══ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Building2 size={18} /> ביצוע ותוכניות לפי מרכז</h2>
          <Link to="/analytics" className={styles.sectionAction}>צפייה מפורטת</Link>
        </div>
        <div className={styles.rankingExplain}>
          לחץ על מרכז לפירוט מאמנים · נתוני ביצוע מבוססים על אימונים שתאריכם עבר
        </div>

        {activeCenters.length > 0 ? (
          <div className={styles.centerTable}>
            {/* Table header */}
            <div className={styles.centerTableHeader}>
              <div className={styles.centerTableCol}>מרכז</div>
              <div className={styles.centerTableCol}>ביצוע</div>
              <div className={styles.centerTableCol}>תוכניות</div>
              <div className={styles.centerTableCol}>מאמנים</div>
            </div>

            {activeCenters.map(center => {
              const isExpanded = expandedCenterId === center.id;
              const execColor = center.completionRate >= 75 ? 'success' : center.completionRate >= 50 ? 'warning' : 'danger';
              const planColor = center.planRate >= 75 ? 'success' : center.planRate >= 50 ? 'warning' : 'danger';

              return (
                <div key={center.id} className={styles.centerTableGroup}>
                  <div
                    className={`${styles.centerTableRow} ${isExpanded ? styles.centerTableRowExpanded : ''}`}
                    onClick={() => setExpandedCenterId(isExpanded ? null : center.id)}
                  >
                    <div className={styles.centerTableCol}>
                      <div className={styles.centerTableName}>
                        <ChevronDown size={14} className={styles.centerTableChevron} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                        {center.name}
                      </div>
                    </div>
                    <div className={styles.centerTableCol}>
                      <div className={styles.centerTableMetric}>
                        <div className={styles.centerTableBar}>
                          <div className={`${styles.centerTableBarFill} ${styles[execColor]}`} style={{ width: `${center.completionRate}%` }} />
                        </div>
                        <span className={`${styles.centerTableRate} ${styles[execColor]}`}>{center.completionRate}%</span>
                      </div>
                      <div className={styles.centerTableSub}>{center.completed}/{center.trainings}</div>
                    </div>
                    <div className={styles.centerTableCol}>
                      <span className={`${styles.centerTableRate} ${styles[planColor]}`}>{center.plansSubmitted}/{center.plansTotal}</span>
                    </div>
                    <div className={styles.centerTableCol}>
                      <span className={styles.centerTableCoachCount}>{center.coaches}</span>
                    </div>
                  </div>

                  {/* Expanded coach details */}
                  {isExpanded && center.coachDetails.length > 0 && (
                    <div className={styles.centerTableExpanded}>
                      {center.coachDetails.map(coach => {
                        const coachExecColor = coach.trainingRate >= 75 ? 'success' : coach.trainingRate >= 50 ? 'warning' : 'danger';
                        return (
                          <div key={coach.id} className={styles.centerTableCoachRow}>
                            <div className={styles.centerTableCol}>
                              <div className={styles.centerTableCoachName}>
                                <div className={styles.coachAvatar}>{coach.name?.charAt(0) || 'M'}</div>
                                {coach.name}
                              </div>
                            </div>
                            <div className={styles.centerTableCol}>
                              <div className={styles.centerTableMetric}>
                                <div className={styles.centerTableBar}>
                                  <div className={`${styles.centerTableBarFill} ${styles[coachExecColor]}`} style={{ width: `${coach.trainingRate}%` }} />
                                </div>
                                <span className={`${styles.centerTableRate} ${styles[coachExecColor]}`}>{coach.trainingRate}%</span>
                              </div>
                              <div className={styles.centerTableSub}>{coach.completedTrainings}/{coach.trainings}</div>
                            </div>
                            <div className={styles.centerTableCol}>
                              <span className={styles.centerTableRate}>{coach.plansSubmitted}/{coach.plansTotal}</span>
                              {coach.plansDraft > 0 && <span className={styles.centerTableDraftBadge}>{coach.plansDraft} טיוטה</span>}
                            </div>
                            <div className={styles.centerTableCol}>
                              <span className={styles.centerTableSub}>{coach.groups} קבוצות</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded && center.coachDetails.length === 0 && (
                    <div className={styles.centerTableExpanded}>
                      <div className={styles.emptyState}>אין מאמנים פעילים במרכז</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>אין נתונים זמינים</div>
        )}
      </div>

      {/* ═══ Section: הקשר חודשי ═══ */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionDividerText}>הקשר חודשי</span>
      </div>

      {/* ═══ Monthly Context ═══ */}
      <div className={styles.contextGrid}>
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <div className={styles.contextTitle} style={{ color: 'var(--accent-700)' }}><Target size={18} /> מטרות החודש</div>
          </div>
          <div className={styles.goalsByGroup}>
            {monthlyGoalsArray.length > 0 ? (
              <div className={styles.cardContent}>
                {monthlyGoalsArray.map(goal => <span key={goal.id} className={`${styles.tag} ${styles.tagGoal}`}>{goal.name}</span>)}
              </div>
            ) : Object.keys(monthlyGoalsByGroup).length > 0 ? (
              DEFAULT_GROUP_TYPES.map(groupType => {
                const goal = monthlyGoalsByGroup[groupType.id];
                if (!goal) return null;
                return (
                  <div key={groupType.id} className={styles.goalRow}>
                    <span className={styles.goalGroupLabel}>{groupType.name}</span>
                    <span className={`${styles.tag} ${styles.tagGoal}`}>{goal}</span>
                  </div>
                );
              })
            ) : <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>טרם הוגדרו מטרות</span>}
          </div>
        </div>
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <div className={styles.contextTitle} style={{ color: 'var(--primary-700)' }}><Heart size={18} /> ערכי החודש</div>
          </div>
          <div className={styles.cardContent}>
            {monthlyValues.length > 0 ? monthlyValues.map(value => <span key={value.id} className={`${styles.tag} ${styles.tagValue}`}>{value.name}</span>) : <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>טרם הוגדרו ערכים</span>}
          </div>
        </div>
      </div>

      {/* ═══ Navigation Cards ═══ */}
      <h2 className={styles.navSectionTitle}><ShieldCheck size={20} /> ניהול שוטף</h2>
      <div className={styles.grid}>
        {dashboardItems.map((item, index) => (
          <div key={index} className={styles.card} onClick={() => navigate(item.path)}>
            <div className={`${styles.cardIcon} ${styles[item.color]}`}><item.icon size={24} /></div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardDescription}>{item.description}</p>
          </div>
        ))}
      </div>

      <MonthlyOutstandingCard />

      {/* ═══ MODALS ═══ */}

      {/* Coaches List Modal */}
      <DetailModal isOpen={statModal === 'coaches'} onClose={() => setStatModal(null)} title="מאמנים פעילים" icon={Users}>
        {coachesByCenter.map(group => (
          <div key={group.centerName}>
            <div className={styles.modalSectionTitle}>{group.centerName}</div>
            {group.coaches.map(c => (
              <div key={c.id} className={styles.modalRow}>
                <div className={styles.coachAvatar}>{c.name?.charAt(0) || 'M'}</div>
                <div className={styles.modalRowInfo}><div className={styles.modalRowName}>{c.name}</div></div>
              </div>
            ))}
          </div>
        ))}
        {coachesByCenter.length === 0 && <div className={styles.emptyState}>אין מאמנים פעילים</div>}
      </DetailModal>

      {/* Today's Trainings Modal - Grouped by Center */}
      <DetailModal isOpen={statModal === 'todayTrainings'} onClose={() => setStatModal(null)} title="אימונים היום" icon={Clock}>
        {todayTrainingsByCenterGrouped.length > 0 ? (
          <>
            {/* Summary */}
            <div className={styles.modalSummary}>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue} style={{ color: 'var(--success-600)' }}>{todayTrainingsDetail.filter(t => t.status === 'completed').length}</div>
                <div className={styles.modalSummaryLabel}>בוצעו</div>
              </div>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue} style={{ color: 'var(--warning-600)' }}>{todayTrainingsDetail.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length}</div>
                <div className={styles.modalSummaryLabel}>לא בוצעו</div>
              </div>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue}>{todayTrainingsDetail.length}</div>
                <div className={styles.modalSummaryLabel}>סה״כ</div>
              </div>
            </div>
            {/* By Center */}
            {todayTrainingsByCenterGrouped.map(group => (
              <div key={group.centerName}>
                <div className={styles.modalSectionTitle}>
                  {group.centerName}
                  <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-tertiary)', marginInlineStart: '8px' }}>
                    {group.completed} מתוך {group.trainings.length}
                  </span>
                </div>
                {group.trainings.map(t => (
                  <div key={t.id} className={styles.modalRow}>
                    <div className={styles.coachAvatar}>{t.coachName?.charAt(0) || 'M'}</div>
                    <div className={styles.modalRowInfo}>
                      <div className={styles.modalRowName}>{t.groupName}</div>
                      <div className={styles.modalRowCenter}>{t.coachName}</div>
                    </div>
                    <div className={styles.modalRowStats}>
                      {t.time && <span>{t.time}</span>}
                      {statusBadge(t.status)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        ) : <div className={styles.emptyState}>אין אימונים מתוכננים להיום</div>}
      </DetailModal>

      {/* Training Execution Detail Modal */}
      <DetailModal isOpen={trainingModal} onClose={() => setTrainingModal(false)} title={`פירוט ביצוע אימונים - ${monthName}`} icon={BarChart2}>
        {/* Summary */}
        <div className={styles.modalSummary}>
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.completed }}>{trainingExec.completed}</div>
            <div className={styles.modalSummaryLabel}>בוצעו</div>
          </div>
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.notCompleted }}>{trainingExec.notCompleted}</div>
            <div className={styles.modalSummaryLabel}>לא בוצעו</div>
          </div>
          {trainingExec.cancelled > 0 && (
            <div className={styles.modalSummaryItem}>
              <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.cancelled }}>{trainingExec.cancelled}</div>
              <div className={styles.modalSummaryLabel}>בוטלו</div>
            </div>
          )}
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue}>{trainingExec.total}</div>
            <div className={styles.modalSummaryLabel}>סה״כ</div>
          </div>
        </div>

        <div className={styles.modalSectionTitle}>לפי מרכז ({trainingExec.byCenter.length})</div>
        {trainingExec.byCenter.map(center => (
          <div key={center.name} className={styles.modalRow}>
            <div className={styles.modalRowInfo}>
              <div className={styles.modalRowName}>{center.name}</div>
              <div className={styles.modalRowCenter}>{center.completed} מתוך {center.total} אימונים{center.cancelled > 0 ? ` · ${center.cancelled} בוטלו` : ''}</div>
            </div>
            <div className={styles.modalRowStats}>
              <span style={{ fontWeight: 700 }}>{center.rate}%</span>
              <span>{center.completed}/{center.total}</span>
            </div>
            <div className={styles.modalRowBar}><div className={styles.modalRowBarFill} style={{ width: `${center.rate}%`, backgroundColor: CHART_COLORS.completed }} /></div>
          </div>
        ))}

        <div className={styles.modalSectionTitle}>לפי מאמן ({trainingExec.byCoach.length})</div>
        {trainingExec.byCoach.map(coach => (
          <div key={coach.name} className={styles.modalRow}>
            <div className={styles.coachAvatar}>{coach.name?.charAt(0) || 'M'}</div>
            <div className={styles.modalRowInfo}>
              <div className={styles.modalRowName}>{coach.name}</div>
              <div className={styles.modalRowCenter}>{coach.centerName || ''} · {coach.completed} מתוך {coach.total}{coach.cancelled > 0 ? ` · ${coach.cancelled} בוטלו` : ''}</div>
            </div>
            <div className={styles.modalRowStats}>
              <span style={{ fontWeight: 700 }}>{coach.rate}%</span>
              <span>{coach.completed}/{coach.total}</span>
            </div>
            <div className={styles.modalRowBar}><div className={styles.modalRowBarFill} style={{ width: `${coach.rate}%`, backgroundColor: CHART_COLORS.completed }} /></div>
          </div>
        ))}
      </DetailModal>

      {/* Plan Submission Detail Modal */}
      <DetailModal isOpen={planModal} onClose={() => setPlanModal(false)} title={`פירוט הגשת תוכניות - ${monthName}`} icon={FileText}>
        {/* Summary */}
        <div className={styles.modalSummary}>
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.submitted }}>{planData.submitted}</div>
            <div className={styles.modalSummaryLabel}>הוגשו</div>
          </div>
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.draft }}>{planData.draft}</div>
            <div className={styles.modalSummaryLabel}>טיוטה</div>
          </div>
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue} style={{ color: 'var(--error-500)' }}>{planData.missing}</div>
            <div className={styles.modalSummaryLabel}>חסרות</div>
          </div>
          <div className={styles.modalSummaryItem}>
            <div className={styles.modalSummaryValue}>{planData.total}</div>
            <div className={styles.modalSummaryLabel}>סה״כ קבוצות</div>
          </div>
        </div>

        <div className={styles.modalSectionTitle}>לפי מרכז ({planData.byCenter.length})</div>
        {planData.byCenter.map(center => {
          const rate = center.total > 0 ? Math.round((center.submitted / center.total) * 100) : 0;
          return (
            <div key={center.name} className={styles.modalRow}>
              <div className={styles.modalRowInfo}>
                <div className={styles.modalRowName}>{center.name}</div>
                <div className={styles.modalRowCenter}>{center.submitted} מתוך {center.total} קבוצות</div>
              </div>
              <div className={styles.modalRowStats}>
                <span style={{ fontWeight: 700 }}>{rate}%</span>
                <span>{center.submitted}/{center.total}</span>
              </div>
              <div className={styles.modalRowBar}><div className={styles.modalRowBarFill} style={{ width: `${rate}%`, backgroundColor: CHART_COLORS.submitted }} /></div>
            </div>
          );
        })}

        <div className={styles.modalSectionTitle}>לפי מאמן ({planData.byCoach.length})</div>
        {planData.byCoach.map(coach => {
          const rate = coach.total > 0 ? Math.round((coach.submitted / coach.total) * 100) : 0;
          return (
            <div key={coach.name} className={styles.modalRow}>
              <div className={styles.coachAvatar}>{coach.name?.charAt(0) || 'M'}</div>
              <div className={styles.modalRowInfo}>
                <div className={styles.modalRowName}>{coach.name}</div>
                <div className={styles.modalRowCenter}>{coach.centerName || ''} · {coach.submitted} מתוך {coach.total}</div>
              </div>
              <div className={styles.modalRowStats}>
                <span style={{ fontWeight: 700 }}>{rate}%</span>
                <span>{coach.submitted}/{coach.total}</span>
              </div>
              <div className={styles.modalRowBar}><div className={styles.modalRowBarFill} style={{ width: `${rate}%`, backgroundColor: CHART_COLORS.submitted }} /></div>
            </div>
          );
        })}
      </DetailModal>

      {/* Center Detail Modal */}
      <DetailModal isOpen={!!selectedCenter} onClose={() => setSelectedCenter(null)} title={selectedCenter?.name || ''} icon={Building2}>
        {selectedCenter && (
          <>
            {/* Summary */}
            <div className={styles.modalSummary}>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue}>{selectedCenter.coaches}</div>
                <div className={styles.modalSummaryLabel}>מאמנים</div>
              </div>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue}>{selectedCenter.groups}</div>
                <div className={styles.modalSummaryLabel}>קבוצות</div>
              </div>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.completed }}>{selectedCenter.completionRate}%</div>
                <div className={styles.modalSummaryLabel}>ביצוע</div>
              </div>
              <div className={styles.modalSummaryItem}>
                <div className={styles.modalSummaryValue} style={{ color: CHART_COLORS.submitted }}>{selectedCenter.planRate}%</div>
                <div className={styles.modalSummaryLabel}>תוכניות</div>
              </div>
            </div>

            {/* Training execution */}
            <div className={styles.modalSectionTitle}>ביצוע אימונים</div>
            <div className={styles.modalRow}>
              <div className={styles.modalRowInfo}>
                <div className={styles.modalRowName}>{selectedCenter.completed} מתוך {selectedCenter.trainings} אימונים{selectedCenter.cancelled > 0 ? ` · ${selectedCenter.cancelled} בוטלו` : ''}</div>
              </div>
              <div className={styles.modalRowBar} style={{ width: 80 }}>
                <div className={styles.modalRowBarFill} style={{ width: `${selectedCenter.completionRate}%`, backgroundColor: CHART_COLORS.completed }} />
              </div>
            </div>

            {/* Plan submission */}
            <div className={styles.modalSectionTitle}>הגשת תוכניות</div>
            <div className={styles.modalRow}>
              <div className={styles.modalRowInfo}>
                <div className={styles.modalRowName}>{selectedCenter.plansSubmitted} מתוך {selectedCenter.plansTotal} תוכניות</div>
              </div>
              <div className={styles.modalRowBar} style={{ width: 80 }}>
                <div className={styles.modalRowBarFill} style={{ width: `${selectedCenter.planRate}%`, backgroundColor: CHART_COLORS.submitted }} />
              </div>
            </div>

            {/* Per-coach breakdown */}
            {selectedCenter.coachDetails?.length > 0 && (
              <>
                <div className={styles.modalSectionTitle}>מאמנים ({selectedCenter.coachDetails.length})</div>
                {selectedCenter.coachDetails.map(coach => (
                  <div key={coach.id} className={styles.modalRow}>
                    <div className={styles.coachAvatar}>{coach.name?.charAt(0) || 'M'}</div>
                    <div className={styles.modalRowInfo}>
                      <div className={styles.modalRowName}>{coach.name}</div>
                      <div className={styles.modalRowCenter}>
                        {coach.groups} קבוצות · {coach.completedTrainings}/{coach.trainings} אימונים ({coach.trainingRate}%) · {coach.plansSubmitted}/{coach.plansTotal} תוכניות
                      </div>
                    </div>
                    <div className={styles.modalRowBar}>
                      <div className={styles.modalRowBarFill} style={{ width: `${coach.trainingRate}%`, backgroundColor: CHART_COLORS.completed }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </DetailModal>

    </div>
  );
};

export default ManagerDashboard;
