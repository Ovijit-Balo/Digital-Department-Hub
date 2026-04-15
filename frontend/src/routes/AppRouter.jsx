import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AdminLayout from '../components/layout/AdminLayout';
import RoleGuard from '../components/layout/RoleGuard';
import HomePage from '../pages/public/HomePage';
import NewsPage from '../pages/public/NewsPage';
import ScholarshipPage from '../pages/public/ScholarshipPage';
import EventsPage from '../pages/public/EventsPage';
import BookingPage from '../pages/public/BookingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import AdminPanelPage from '../pages/admin/AdminPanelPage';

function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/scholarship" element={<ScholarshipPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/booking" element={<BookingPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/admin"
        element={
          <RoleGuard roles={['admin', 'editor', 'manager']}>
            <AdminLayout />
          </RoleGuard>
        }
      >
        <Route index element={<AdminPanelPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
