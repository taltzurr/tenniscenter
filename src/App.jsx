import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import useAuthStore from './stores/authStore';
import ProtectedRoute from './routes/ProtectedRoute';
import PageContainer from './components/layout/PageContainer';
import ToastContainer from './components/ui/Toast';
import Spinner from './components/ui/Spinner';
import './styles/global.css';

// Lazy load all page components for better code splitting
const LoginPage = lazy(() => import('./features/auth/LoginPage/LoginPage'));
const CoachDashboard = lazy(() => import('./features/dashboard/CoachDashboard'));
const ManagerDashboard = lazy(() => import('./features/dashboard/ManagerDashboard'));
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
const ExerciseForm = lazy(() => import('./features/exercises/ExerciseForm/ExerciseForm'));
const RequestForm = lazy(() => import('./features/exerciseRequests/RequestForm/RequestForm'));
const RequestsList = lazy(() => import('./features/exerciseRequests/RequestsList/RequestsList'));
const PlanForm = lazy(() => import('./features/monthlyPlans/PlanForm/PlanForm'));
const PlansList = lazy(() => import('./features/monthlyPlans/PlansList/PlansList'));
const ManagerPlansReview = lazy(() => import('./features/monthlyPlans/ManagerPlansReview/ManagerPlansReview'));
const EventsCalendarPage = lazy(() => import('./features/manager/MonthlyThemes/EventsCalendarPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const GoalsPage = lazy(() => import('./features/goals/GoalsPage/GoalsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const CentersPage = lazy(() => import('./features/centers/CentersPage'));

// Dashboard Wrapper Component
function DashboardWrapper() {
  const { isCenterManager, isSupervisor } = useAuthStore();

  if (isCenterManager() || isSupervisor()) {
    return <ManagerDashboard />;
  }

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
          <Route path="/analytics" element={<ManagerAnalyticsDashboard />} />

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
          <Route path="/exercises/:id" element={<ExerciseForm />} />
          <Route path="/exercises/:id/edit" element={<ExerciseForm />} />

          {/* Exercise Requests routes */}
          <Route path="/exercise-requests" element={<RequestsList />} />
          <Route path="/exercise-requests/new" element={<RequestForm />} />

          {/* Monthly Plans routes */}
          <Route path="/monthly-plans" element={<PlansList />} />
          <Route path="/monthly-plans/new" element={<PlanForm />} />
          <Route path="/monthly-plans/edit" element={<PlanForm />} />
          <Route path="/monthly-plans/review" element={<ManagerPlansReview />} />

          {/* Manager routes */}
          <Route path="/events-calendar" element={<EventsCalendarPage />} />

          <Route path="/trainings" element={<Navigate to="/weekly-schedule" replace />} />
          <Route path="/centers" element={<CentersPage />} />
          <Route path="/users" element={<UsersPage />} />

          {/* Goals routes */}
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
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
