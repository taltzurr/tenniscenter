import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './stores/authStore';
import ProtectedRoute from './routes/ProtectedRoute';
import PageContainer from './components/layout/PageContainer';
import ToastContainer from './components/ui/Toast';
import LoginPage from './features/auth/LoginPage';
import { CoachDashboard, ManagerDashboard, ManagerAnalyticsDashboard } from './features/dashboard';
import { GroupList, GroupForm, GroupDetails } from './features/groups';
import { TrainingProgramPage, TrainingForm, WeeklySchedulePage, TrainingDetailsPage, WeeklyStatusPage } from './features/trainings';
import { ExerciseList, ExerciseForm } from './features/exercises';
import { RequestForm, RequestsList } from './features/exerciseRequests';
import { PlanForm, PlansList, ManagerPlansReview } from './features/monthlyPlans';
import TrainingBuilderPage from './features/trainings/TrainingBuilder/TrainingBuilderPage';
import EventsCalendarPage from './features/manager/MonthlyThemes/EventsCalendarPage';
import SettingsPage from './features/settings/SettingsPage';
import { GoalsPage } from './features/goals';
import { UsersPage } from './features/users';
import { CentersPage } from './features/centers';
import Spinner from './components/ui/Spinner';
import './styles/global.css';

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

      {/* Global Toast Container */}
      <ToastContainer />
    </BrowserRouter>
  );
}


export default App;
