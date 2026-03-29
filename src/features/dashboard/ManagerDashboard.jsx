import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Building2, Calendar, BarChart2, BarChart3, Trophy, Heart, Target,
  ShieldCheck, AlertTriangle, CheckCircle, Clock, FileText, TrendingUp,
  CalendarDays, Info, ArrowUp, ArrowDown, ChevronLeft, X
} from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../stores/authStore';
import useUsersStore from '../../stores/usersStore';
import useGroupsStore from '../../stores/groupsStore';
import useMonthlyPlansStore from '../../stores/monthlyPlansStore';
import useCentersStore from '../../stores/centersStore';
import useMonthlyThemesStore from '../../stores/monthlyThemesStore';
import { getOrganizationTrainings } from '../../services/trainings';
import { normalizeDate } from '../../utils/dateUtils';
import {
  getOrgQuickStats,
  getAlerts,
  getTodayTrainingsByCenter,
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
  const { userData, isSupervisor, isCenterManager } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  const { groups, fetchGroups } = useGroupsStore();
  const { plans: monthlyPlans, fetchAllPlans } = useMonthlyPlansStore();
  const { centers, fetchCenters } = useCentersStore();
  const { fetchTheme, currentTheme } = useMonthlyThemesStore();

  const isCM = isCenterManager();
  const managedCenterId = userData?.managedCenterId;

  const [orgTrainings, setOrgTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllBottom, setShowAllBottom] = useState(false);
  const [trainingModal, setTrainingModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [statModal, setStatModal] = useState(null); // 'coaches' | 'todayTrainings'

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
          isCM ? fetchGroups(null, false, managedCenterId) : fetchGroups(null, true),
          fetchCenters(),
          fetchAllPlans(currentYear, currentMonth),
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
  }, [fetchUsers, fetchGroups, fetchCenters, fetchAllPlans, fetchTheme, currentYear, currentMonth]);

  // Center-scoped data for centerManager
  const effectiveCenters = useMemo(() => {
    if (!isCM || !managedCenterId) return centers;
    return centers.filter(c => c.id === managedCenterId);
  }, [centers, isCM, managedCenterId]);

  const effectiveUsers = useMemo(() => {
    if (!isCM || !managedCenterId) return users;
    return users.filter(u =>
      u.role === 'coach' && u.isActive !== false && u.centerIds?.includes(managedCenterId)
    );
  }, [users, isCM, managedCenterId]);

  // ── Computed Data ──
  const quickStats = useMemo(() => {
    if (!effectiveUsers.length || !effectiveCenters.length) return null;
    return getOrgQuickStats(effectiveUsers, orgTrainings, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth);
  }, [effectiveUsers, orgTrainings, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth]);

  // Count trainings this week (Sunday–Saturday, matching CoachDashboard)
  const weekTrainingsCount = useMemo(() => {
    if (!orgTrainings?.length) return 0;
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    return orgTrainings.filter(t => {
      const d = normalizeDate(t.date);
      return d && d >= startOfWeek && d <= endOfWeek;
    }).length;
  }, [orgTrainings]);

  const alerts = useMemo(() => {
    if (!effectiveUsers.length) return [];
    return getAlerts(effectiveUsers, orgTrainings, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth);
  }, [effectiveUsers, orgTrainings, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth]);

  const todayByCenter = useMemo(() =>
    getTodayTrainingsByCenter(orgTrainings, groups, effectiveUsers, effectiveCenters),
    [orgTrainings, groups, effectiveUsers, effectiveCenters]);


  const planStatus = useMemo(() =>
    getPlanSubmissionStatus(effectiveUsers, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth),
    [effectiveUsers, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth]);

  const topBottom = useMemo(() =>
    getTopBottomCoaches(effectiveUsers, orgTrainings, groups, effectiveCenters),
    [effectiveUsers, orgTrainings, groups, effectiveCenters]);

  const trainingExec = useMemo(() =>
    getTrainingExecutionData(orgTrainings, groups, effectiveUsers, effectiveCenters),
    [orgTrainings, groups, effectiveUsers, effectiveCenters]);

  const planData = useMemo(() =>
    getPlanSubmissionData(effectiveUsers, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth),
    [effectiveUsers, monthlyPlans, groups, effectiveCenters, currentYear, currentMonth]);

  // Stat card detail data
  const coachesByCenter = useMemo(() =>
    getCoachesListByCenter(effectiveUsers, effectiveCenters),
    [effectiveUsers, effectiveCenters]);

  const todayTrainingsDetail = useMemo(() =>
    getTodayTrainingsDetail(orgTrainings, groups, effectiveUsers, effectiveCenters),
    [orgTrainings, groups, effectiveUsers, effectiveCenters]);

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
    { title: isCM ? 'מאמנים' : 'ניהול משתמשים', description: isCM ? 'צפייה ועריכה של מאמני המרכז.' : 'צפייה, הוספה ועריכה של משתמשים, מאמנים ומנהלים.', icon: Users, color: 'blue', path: '/users' },
    ...(isSupervisor() ? [{ title: 'ניהול מרכזים', description: 'הגדרת מרכזים, כתובות ופרטי התקשרות.', icon: Building2, color: 'green', path: '/centers' }] : []),
    { title: 'נתונים', description: 'דוחות ביצוע, סטטיסטיקות מאמנים ומעקב.', icon: BarChart3, color: 'orange', path: '/analytics' },
    { title: isCM ? 'לוח אירועים' : 'מטרות וערכים', description: isCM ? 'ניהול אירועים למרכז שלך.' : 'מטרות חודשיות, ערכים ואירועים ארגוניים.', icon: Calendar, color: 'purple', path: '/events-calendar' },
    { title: 'מצטייני החודש', description: 'בחירת מאמנים ומרכזים מצטיינים.', icon: Trophy, color: 'yellow', path: '/monthly-outstanding' }
  ], [isSupervisor, isCM]);

  const alertIconMap = { danger: AlertTriangle, warning: AlertTriangle, info: Info };
  const monthName = format(currentDate, 'MMMM', { locale: he });

  // ── Brand Colors for Charts (from logo palette) ──
  const CHART_COLORS = {
    completed: '#3d7db5',    // primary-600 (blue)
    notCompleted: '#d4b82e', // accent-600 (gold)
    cancelled: '#f44336',    // error-500 (red)
    submitted: '#388e3c',    // success-700 (green)
    draft: '#f5d742',        // accent-500 (gold)
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
          {isCM && effectiveCenters[0] ? `${effectiveCenters[0].name} · ` : ''}
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
            <div className={`${styles.statIcon} ${styles.green}`}><TrendingUp size={18} className={styles.rtlIcon} /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{quickStats.completionRate}%</div>
              <div className={styles.statLabel}>ביצוע חודשי</div>
            </div>
          </div>
          <div className={styles.statCard} onClick={() => navigate('/weekly-schedule')}>
            <div className={`${styles.statIcon} ${styles.yellow}`}><CalendarDays size={18} /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{weekTrainingsCount}</div>
              <div className={styles.statLabel}>אימוני השבוע</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section: מצב נוכחי ═══ */}
      <div className={styles.pageSectionHeader}>
        <ShieldCheck size={18} className={styles.pageSectionIcon} />
        <h2 className={styles.pageSectionTitle}>מצב נוכחי</h2>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}><AlertTriangle size={18} className={styles.sectionIcon} /><h2 className={styles.sectionTitle}>התראות</h2></div>
            <span className={styles.alertBadge}>{alerts.length}</span>
          </div>
          <div className={styles.alertsList}>
            {alerts.map((alert, i) => {
              const AlertIcon = alertIconMap[alert.type] || Info;
              const handleAlertClick = () => {
                if (!alert.action) return;
                if (alert.action.type === 'navigate') {
                  navigate(alert.action.path);
                } else if (alert.action.type === 'modal') {
                  if (alert.action.modal === 'trainings') setTrainingModal(true);
                  else if (alert.action.modal === 'plans') setPlanModal(true);
                }
              };
              return (
                <div
                  key={i}
                  className={`${styles.alertItem} ${styles[alert.type]} ${alert.action ? styles.alertClickable : ''}`}
                  onClick={handleAlertClick}
                >
                  <AlertIcon size={16} className={`${styles.alertIcon} ${styles[alert.type]}`} />
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitle}>{alert.title}</div>
                    {alert.details && <div className={styles.alertDetails}>{alert.details}</div>}
                  </div>
                  {alert.action && (
                    <div className={styles.alertAction}>
                      <span className={styles.alertActionLabel}>{alert.action.label}</span>
                      <ChevronLeft size={14} />
                    </div>
                  )}
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

      {/* Today's Trainings by Center - only for supervisor */}
      {!isCM && todayByCenter.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}><Clock size={18} className={styles.sectionIcon} /><h2 className={styles.sectionTitle}>אימונים היום לפי מרכז</h2></div>
            <span className={styles.sectionAction} onClick={() => setStatModal('todayTrainings')} style={{ cursor: 'pointer' }}>פירוט מלא</span>
          </div>
          <div className={styles.centerTrainingsList}>
            {todayByCenter.map(c => {
              const completionRate = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
              const statusColor = completionRate >= 75 ? 'success' : completionRate >= 50 ? 'warning' : 'danger';
              return (
                <div key={c.centerId} className={styles.centerTrainingRow} onClick={() => setStatModal('todayTrainings')}>
                  <div className={styles.centerTrainingInfo}>
                    <div className={styles.centerTrainingName}>{c.centerName}</div>
                    <div className={styles.centerTrainingMeta}>
                      <span className={`${styles.centerTrainingStatus} ${styles[statusColor]}`}>{c.completed} הושלמו</span>
                      <span className={styles.centerTrainingDivider}>·</span>
                      <span>{c.pending} נותרו</span>
                    </div>
                  </div>
                  <div className={styles.centerTrainingCount}>{c.total}</div>
                  <ChevronLeft size={14} className={styles.centerTrainingChevron} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Section: ביצועים חודשיים ═══ */}
      <div className={styles.pageSectionHeader}>
        <BarChart2 size={18} className={styles.pageSectionIcon} />
        <h2 className={styles.pageSectionTitle}>ביצועים חודשיים</h2>
      </div>

      {/* ═══ Pie Charts ═══ */}
      <div className={styles.pieChartsGrid}>
        <div className={styles.pieChartCard} onClick={() => setTrainingModal(true)}>
          <div className={styles.pieChartHeader}>
            <h2 className={styles.sectionTitle}>ביצוע אימונים מתוכננים - {monthName}</h2>
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
            <h2 className={styles.sectionTitle}>הגשת תוכניות - {monthName}</h2>
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


      {/* ═══ Section: הקשר חודשי ═══ */}
      <div className={styles.pageSectionHeader}>
        <Calendar size={18} className={styles.pageSectionIcon} />
        <h2 className={styles.pageSectionTitle}>הקשר חודשי</h2>
      </div>

      {/* ═══ Monthly Context ═══ */}
      <div className={styles.contextGrid}>
        <div className={styles.contextCard}>
          <div className={styles.contextCardHeader}>
            <Target size={16} className={styles.contextCardIcon} style={{ color: 'var(--accent-700)' }} />
            <h3 className={styles.contextCardTitle}>מטרות החודש</h3>
          </div>
          {monthlyGoalsArray.length > 0 ? (
            <div className={styles.goalsList}>
              {monthlyGoalsArray.map(goal => (
                <div key={goal.id} className={styles.goalItem}>
                  <span className={styles.goalText}>{goal.name}</span>
                </div>
              ))}
            </div>
          ) : Object.keys(monthlyGoalsByGroup).length > 0 ? (
            <div className={styles.goalsList}>
              {DEFAULT_GROUP_TYPES.map(groupType => {
                const goal = monthlyGoalsByGroup[groupType.id];
                if (!goal) return null;
                return (
                  <div key={groupType.id} className={styles.goalItem}>
                    <span className={styles.goalTypeBadge}>{groupType.name}</span>
                    <span className={styles.goalText}>{goal}</span>
                  </div>
                );
              })}
            </div>
          ) : <div className={styles.contextEmpty}>טרם הוגדרו מטרות</div>}
        </div>

        <div className={styles.contextCard}>
          <div className={styles.contextCardHeader}>
            <Heart size={16} className={styles.contextCardIcon} style={{ color: 'var(--primary-600)' }} />
            <h3 className={styles.contextCardTitle}>ערכי החודש</h3>
          </div>
          {monthlyValues.length > 0 ? (
            <div className={styles.valuesList}>
              {monthlyValues.map(value => (
                <span key={value.id} className={styles.valueTag}>{value.name}</span>
              ))}
            </div>
          ) : <div className={styles.contextEmpty}>טרם הוגדרו ערכים</div>}
        </div>
      </div>

      {/* ═══ Navigation Cards ═══ */}
      <div className={styles.pageSectionHeader}>
        <Building2 size={18} className={styles.pageSectionIcon} />
        <h2 className={styles.pageSectionTitle}>ניהול שוטף</h2>
      </div>
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

        {!isCM && (
          <>
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
          </>
        )}

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

        {!isCM && (
          <>
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
          </>
        )}

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

    </div>
  );
};

export default ManagerDashboard;
