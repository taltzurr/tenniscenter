import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Calendar, CheckCircle, TrendingUp, Clock, FileText, Target, CalendarDays } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../stores/authStore';
import useUsersStore from '../../stores/usersStore';
import useGroupsStore from '../../stores/groupsStore';
import useMonthlyPlansStore from '../../stores/monthlyPlansStore';
import useCentersStore from '../../stores/centersStore';
import useEventsStore from '../../stores/eventsStore';
import { getOrganizationTrainings } from '../../services/trainings';
import {
  getCenterCoaches,
  getCoachPlanProgress,
  getCoachExecutionRate,
  getTodaysTrainings,
  getStatusColor,
  getStatusText
} from './utils/centerDashboardUtils';
import Spinner from '../../components/ui/Spinner/Spinner';
import TrainingCard from '../../components/ui/TrainingCard/TrainingCard';
import { getGreeting } from '../../utils/greeting';
import MonthlyOutstandingCard from '../dashboard/MonthlyOutstandingCard';
import styles from './CenterManagerDashboard.module.css';

const CenterManagerDashboard = () => {
  const navigate = useNavigate();
  const { userData } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  const { groups, fetchGroups } = useGroupsStore();
  const { plans: monthlyPlans, fetchAllPlans } = useMonthlyPlansStore();
  const { centers, fetchCenters } = useCentersStore();
  const { events, fetchEvents } = useEventsStore();

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all required data
        await Promise.all([
          fetchUsers(),
          fetchGroups(),
          fetchCenters(),
          fetchAllPlans(currentYear, currentMonth),
          fetchEvents(currentYear, currentMonth, userData?.managedCenterId)
        ]);

        // Fetch trainings for current month
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const trainingsData = await getOrganizationTrainings(monthStart, monthEnd);
        setTrainings(trainingsData || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('שגיאה בטעינת נתוני הדשבורד');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchUsers, fetchGroups, fetchCenters, fetchAllPlans, currentYear, currentMonth]);

  // Get center data
  const managedCenter = useMemo(() => {
    if (!userData?.managedCenterId || !centers || centers.length === 0) return null;
    return centers.find(c => c.id === userData.managedCenterId);
  }, [centers, userData?.managedCenterId]);

  // Filter coaches belonging to this center
  const centerCoaches = useMemo(() => {
    if (!userData?.managedCenterId || !users || users.length === 0) return [];
    return getCenterCoaches(users, userData.managedCenterId);
  }, [users, userData?.managedCenterId]);

  // Get coach IDs for filtering
  const centerCoachIds = useMemo(() => {
    return centerCoaches.map(coach => coach.id);
  }, [centerCoaches]);

  // Filter groups belonging to this center
  const centerGroups = useMemo(() => {
    if (!userData?.managedCenterId || !groups || groups.length === 0) return [];
    return groups.filter(g => g.centerId === userData.managedCenterId && g.isActive !== false);
  }, [groups, userData?.managedCenterId]);

  // Filter trainings for this center
  const centerTrainings = useMemo(() => {
    if (centerCoachIds.length === 0 || !trainings || trainings.length === 0) return [];
    return trainings.filter(t => centerCoachIds.includes(t.coachId));
  }, [trainings, centerCoachIds]);

  // Calculate plan submission stats
  const planStats = useMemo(() => {
    if (centerCoaches.length === 0) return { total: 0, submitted: 0, percentage: 0 };

    const coachesWithProgress = centerCoaches.map(coach =>
      getCoachPlanProgress(coach.id, centerGroups, monthlyPlans, currentYear, currentMonth)
    );

    const coachesWithAllPlans = coachesWithProgress.filter(p => p.isComplete).length;

    return {
      total: centerCoaches.length,
      submitted: coachesWithAllPlans,
      percentage: centerCoaches.length > 0
        ? Math.round((coachesWithAllPlans / centerCoaches.length) * 100)
        : 0
    };
  }, [centerCoaches, centerGroups, monthlyPlans, currentYear, currentMonth]);

  // Get today's trainings
  const todaysTrainingsList = useMemo(() => {
    return getTodaysTrainings(centerTrainings, centerGroups, users);
  }, [centerTrainings, centerGroups, users]);

  // Calculate overall completion rate
  const completionRate = useMemo(() => {
    if (centerTrainings.length === 0) return 0;
    const completed = centerTrainings.filter(t => t.status === 'completed').length;
    return Math.round((completed / centerTrainings.length) * 100);
  }, [centerTrainings]);

  // Calculate per-coach stats for plan submission
  const coachPlanProgress = useMemo(() => {
    return centerCoaches.map(coach => {
      const progress = getCoachPlanProgress(coach.id, centerGroups, monthlyPlans, currentYear, currentMonth);
      return {
        coach,
        ...progress
      };
    }).sort((a, b) => a.percentage - b.percentage); // Sort by percentage, lowest first
  }, [centerCoaches, centerGroups, monthlyPlans, currentYear, currentMonth]);

  // Calculate per-coach execution stats
  const coachExecutionStats = useMemo(() => {
    return centerCoaches.map(coach => {
      const stats = getCoachExecutionRate(coach.id, centerTrainings);
      return {
        coach,
        ...stats
      };
    }).sort((a, b) => b.total - a.total); // Sort by activity volume, highest first
  }, [centerCoaches, centerTrainings]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner />
      </div>
    );
  }

  if (!userData?.managedCenterId) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>לא הוקצה מרכז לניהול</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Greeting Section */}
      <div className={styles.greeting}>
        <h1 className={styles.greetingTitle}>
          {getGreeting()}, {userData?.displayName || 'מנהל'}!
        </h1>
        <p className={styles.greetingSubtitle}>
          לוח בקרה מרכז {managedCenter?.name || 'טניס'}
        </p>
      </div>

      {/* Monthly Outstanding */}
      <MonthlyOutstandingCard />

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {/* Total Coaches */}
        <div className={styles.statCard} onClick={() => navigate('/users')}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <Users size={18} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{centerCoaches.length}</div>
            <div className={styles.statLabel}>מאמנים פעילים</div>
          </div>
        </div>

        {/* Plan Submission Progress */}
        <div className={styles.statCard} onClick={() => navigate('/monthly-plans/review')}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <FileText size={18} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {planStats.submitted}/{planStats.total}
            </div>
            <div className={styles.statLabel}>הגישו תוכניות</div>
          </div>
        </div>

        {/* Today's Trainings */}
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orange}`}>
            <Clock size={18} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{todaysTrainingsList.length}</div>
            <div className={styles.statLabel}>אימונים היום</div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className={styles.statCard} onClick={() => navigate('/analytics')}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            <TrendingUp size={18} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{completionRate}%</div>
            <div className={styles.statLabel}>שיעור ביצוע</div>
          </div>
        </div>

        {/* Events Management */}
        <div className={styles.statCard} onClick={() => navigate('/events-calendar')}>
          <div className={`${styles.statIcon} ${styles.yellow}`}>
            <CalendarDays size={18} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{events?.length || 0}</div>
            <div className={styles.statLabel}>אירועים חודשיים</div>
          </div>
        </div>
      </div>

      {/* Plan Submission Status Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>סטטוס הגשות תוכניות חודשיות</h2>
          <Link to="/monthly-plans/review" className={styles.sectionAction}>
            צפייה מפורטת
          </Link>
        </div>

        {coachPlanProgress.length === 0 ? (
          <div className={styles.emptyState}>
            <CalendarDays className={styles.emptyIcon} />
            <p className={styles.emptyText}>אין מאמנים במרכז</p>
          </div>
        ) : (
          <div className={styles.planProgressList}>
            {coachPlanProgress.map(({ coach, total, submitted, percentage, isComplete }) => {
              const statusColor = getStatusColor(percentage);
              const statusText = getStatusText(percentage);

              return (
                <div key={coach.id} className={styles.coachProgressItem}>
                  <div className={styles.coachAvatar}>
                    {coach.displayName?.charAt(0) || 'M'}
                  </div>
                  <div className={styles.coachProgressInfo}>
                    <div className={styles.coachName}>{coach.displayName}</div>
                    <div className={styles.coachProgressMeta}>
                      {submitted} מתוך {total} קבוצות הגישו
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div
                        className={`${styles.progressBarFill} ${styles[statusColor]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${styles[statusColor]}`}>
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Trainings Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>אימונים היום</h2>
        </div>

        {todaysTrainingsList.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar className={styles.emptyIcon} />
            <p className={styles.emptyText}>אין אימונים מתוכננים להיום</p>
          </div>
        ) : (
          <div className={styles.trainingsList}>
            {todaysTrainingsList.map((training) => (
              <TrainingCard
                key={training.id}
                training={training}
                variant="compact"
                showCoach
                clickable={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Monthly Execution Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ביצוע חודשי - {format(currentDate, 'MMMM yyyy', { locale: he })}</h2>
          <Link to="/analytics" className={styles.sectionAction}>
            צפייה מפורטת
          </Link>
        </div>

        {coachExecutionStats.length === 0 ? (
          <div className={styles.emptyState}>
            <Target className={styles.emptyIcon} />
            <p className={styles.emptyText}>אין נתוני ביצוע זמינים</p>
          </div>
        ) : (
          <div className={styles.executionList}>
            {coachExecutionStats.map(({ coach, total, completed, percentage }) => {
              const statusColor = getStatusColor(percentage);

              return (
                <div key={coach.id} className={styles.executionItem}>
                  <div className={styles.coachAvatar}>
                    {coach.displayName?.charAt(0) || 'M'}
                  </div>
                  <div className={styles.executionCoachInfo}>
                    <div className={styles.executionCoachName}>{coach.displayName}</div>
                    <div className={styles.executionStats}>
                      {completed} מתוך {total} אימונים הושלמו
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div
                        className={`${styles.progressBarFill} ${styles[statusColor]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.executionPercentage}>{percentage}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterManagerDashboard;
