import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingScreen from './components/common/LoadingScreen';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const ScannerLayout = lazy(() => import('./layouts/ScannerLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Guests = lazy(() => import('./pages/Guests'));
const GuestList = lazy(() => import('./pages/GuestList'));
const CardGenerator = lazy(() => import('./pages/CardGenerator'));
const Invitations = lazy(() => import('./pages/Invitations'));
const RSVPDashboard = lazy(() => import('./pages/RSVPDashboard'));
const Scanner = lazy(() => import('./pages/Scanner'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const Settings = lazy(() => import('./pages/Settings'));
const EventWebsite = lazy(() => import('./pages/EventWebsite'));

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return user.role === 'scanner'
      ? <Navigate to="/scanner" replace />
      : <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  // For public event pages, don't wait for auth
  const isPublicEventPage = window.location.pathname.startsWith('/event/');
  if (loading && !isPublicEventPage) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* ── PUBLIC ROUTES ── no auth needed */}
        <Route path="/event/:slug" element={<EventWebsite />} />
        <Route
          path="/login"
          element={
            !loading && user
              ? <Navigate to={user.role === 'scanner' ? '/scanner' : '/dashboard'} replace />
              : <LoginPage />
          }
        />

        {/* ── ADMIN ROUTES ── */}
        <Route path="/" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="events/:id/guests" element={<GuestList />} />
          <Route path="events/:id/cards" element={<CardGenerator />} />
          <Route path="events/:id/invitations" element={<Invitations />} />
          <Route path="events/:id/rsvp" element={<RSVPDashboard />} />
          <Route path="events/:id/activity" element={<ActivityLog />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ── SCANNER ROUTES ── */}
        <Route path="/scanner" element={<ProtectedRoute><ScannerLayout /></ProtectedRoute>}>
          <Route index element={<Scanner />} />
        </Route>

        {/* ── CATCH ALL ── */}
        <Route
          path="*"
          element={
            loading
              ? <LoadingScreen />
              : <Navigate to={user ? (user.role === 'scanner' ? '/scanner' : '/dashboard') : '/login'} replace />
          }
        />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;
