import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import useAuthStore from './stores/authStore';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import PageContainer from './components/layout/PageContainer';
import ToastContainer from './components/ui/Toast';
import Spinner from './components/ui/Spinner';
import './styles/global.css';

// Lazy load all page components for better code splitting
const LoginPage = lazy(() => import('./features/auth/LoginPage/LoginPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage/ResetPasswordPage'));
const WelcomePage = lazy(() => import('./features/auth/WelcomePage/WelcomePage'));
const CoachDashboard = lazy(() => import('./features/dashboard/CoachDashboard'));
const ManagerDashboard = lazy(() => import('./features/dashboard/ManagerDashboard'));
const CenterManagerDashboard = lazy(() => import('./features/dashboard/CenterManagerDashboard'));
const ManagerAnalyticsDashboard = lazy(() => import('./features/dashboard/ManagerAnalyticsDashboard'));
const GroupList = lazy(() => import('./features/groups/GroupList/GroupList'));
const GroupForm = lazy(() => import('./features/groups/GroupForm/GroupForm'));
const GroupDetails = lazy(() => import('./features/groups/GroupDetails/GroupDetails'));
const TrainingProgramPage = lazy(() => import('./features/trainings/TrainingProgramPage/TrainingProgramPage'));
const TrainingForm = lazy(() => import('./features/trainings/TrainingForm/TrainingForm'));
const WeeklySchedulePage = lazy(() => import('./features/trainings/WeeklySchedulePage'));
const TrainingDetailsPage = lazy(() => import('./features/trainings/TrainingDetailsPage'));
const WeeklyStatusPage = lazy(() => import('./features/trainings/WeeklyStatusPage'));
const TrainingBuilderPage = lazy(() => import('./features/trainings/TrainingBuilder/TrainingBuilderPage'));
const ExerciseList = lazy(() => import('./features/exercises/ExerciseList/ExerciseList'));
const ExerciseDetail = lazy(() => import('./features/exercises/ExerciseDetail/ExerciseDetail'));
const ExerciseForm = lazy(() => import('./features/exercises/ExerciseForm/ExerciseForm'));
const RequestForm = lazy(() => import('./features/exerciseRequests/RequestForm/RequestForm'));
const RequestsList = lazy(() => import('./features/exerciseRequests/RequestsList/RequestsList'));
const PlanForm = lazy(() => import('./features/monthlyPlans/PlanForm/PlanForm'));
const PlansList = lazy(() => import('./features/monthlyPlans/PlansList/PlansList'));
const CoachPlansOverview = lazy(() => import('./features/monthlyPlans/CoachPlansOverview/CoachPlansOverview'));
const ManagerPlansReview = lazy(() => import('./features/monthlyPlans/ManagerPlansReview/ManagerPlansReview'));
const EventsCalendarPage = lazy(() => import('./features/manager/MonthlyThemes/EventsCalendarPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const GoalsPage = lazy(() => import('./features/goals/GoalsPage/GoalsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const CentersPage = lazy(() => import('./features/centers/CentersPage'));
const MonthlyOutstandingPage = lazy(() => import('./features/monthlyOutstanding/MonthlyOutstandingPage'));

// Lazy load the center view wrapper
const CenterManagerViewWrapper = lazy(() => import('./features/centers/CenterManagerViewWrapper'));

// Dashboard Wrapper Component
function DashboardWrapper() {
  const { isCenterManager, isSupervisor } = useAuthStore();

  // Supervisors see card navigation dashboard
  if (isSupervisor()) {
    return <ManagerDashboard />;
  }

  // Center managers see the same rich dashboard, scoped to their center
  if (isCenterManager()) {
    return <ManagerDashboard />;
  }

  // Coaches see their dashboard
  return <CoachDashboard />;
}

function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  if (isLoading) {
    return <Spinner.FullPage />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner.FullPage />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <PageContainer />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/calendar" element={<TrainingProgramPage />} />
            <Route path="/weekly-schedule" element={<WeeklySchedulePage />} />
            <Route path="/weekly-completed" element={<WeeklyStatusPage status="completed" />} />
            <Route path="/weekly-pending" element={<WeeklyStatusPage status="pending" />} />
            <Route path="/analytics" element={
              <RoleRoute allowedRoles={['supervisor', 'centerManager']}>
                <ManagerAnalyticsDashboard />
              </RoleRoute>
            } />

            {/* Trainings */}
            <Route path="/trainings/new" element={<TrainingForm />} />
            <Route path="/trainings/:id" element={<TrainingDetailsPage />} />
            <Route path="/trainings/:id/edit" element={<TrainingForm />} />
            <Route path="/trainings/:trainingId/builder" element={<TrainingBuilderPage />} />

            {/* Groups routes */}
            <Route path="/groups" element={<GroupList />} />
            <Route path="/groups/new" element={<GroupForm />} />
            <Route path="/groups/:id" element={<GroupDetails />} />
            <Route path="/groups/:id/edit" element={<GroupForm />} />

            {/* Exercises routes */}
            <Route path="/exercises" element={<ExerciseList />} />
            <Route path="/exercises/new" element={<ExerciseForm />} />
            <Route path="/exercises/:id" element={<ExerciseDetail />} />
            <Route path="/exercises/:id/edit" element={<ExerciseForm />} />

            {/* Exercise Requests routes */}
            <Route path="/exercise-requests" element={
              <RoleRoute allowedRoles={['supervisor']}>
                <RequestsList />
              </RoleRoute>
            } />
            <Route path="/exercise-requests/new" element={<RequestForm />} />

            {/* Monthly Plans routes */}
            <Route path="/monthly-plans" element={<CoachPlansOverview />} />
            <Route path="/monthly-plans/calendar" element={<PlansList />} />
            <Route path="/monthly-plans/new" element={<PlanForm />} />
            <Route path="/monthly-plans/edit" element={<PlanForm />} />
            <Route path="/monthly-plans/review" element={
              <RoleRoute allowedRoles={['supervisor', 'centerManager']}>
                <ManagerPlansReview />
              </RoleRoute>
            } />

            {/* Manager routes */}
            <Route path="/events-calendar" element={<EventsCalendarPage />} />

            <Route path="/trainings" element={<Navigate to="/weekly-schedule" replace />} />
            <Route path="/center-manager-view/:centerId" element={
              <RoleRoute allowedRoles={['supervisor']}>
                <CenterManagerViewWrapper />
              </RoleRoute>
            } />
            <Route path="/centers" element={
              <RoleRoute allowedRoles={['supervisor']}>
                <CentersPage />
              </RoleRoute>
            } />
            <Route path="/users" element={
              <RoleRoute allowedRoles={['supervisor', 'centerManager']}>
                <UsersPage />
              </RoleRoute>
            } />

            {/* Goals routes */}
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/monthly-outstanding" element={
              <RoleRoute allowedRoles={['supervisor', 'centerManager']}>
                <MonthlyOutstandingPage />
              </RoleRoute>
            } />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>

      {/* Global Toast Container */}
      <ToastContainer />
    </BrowserRouter>
  );
}


export default App;
