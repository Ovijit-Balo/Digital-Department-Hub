import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AdminLayout from '../components/layout/AdminLayout';
import RoleGuard from '../components/layout/RoleGuard';
import HomePage from '../pages/public/HomePage';
import NewsPage from '../pages/public/NewsPage';
import AnnouncementsPage from '../pages/public/AnnouncementsPage';
import BlogsPage from '../pages/public/BlogsPage';
import BlogDetailPage from '../pages/public/BlogDetailPage';
import GalleryPage from '../pages/public/GalleryPage';
import PagesPage from '../pages/public/PagesPage';
import DynamicPageView from '../pages/public/DynamicPageView';
import ScholarshipPage from '../pages/public/ScholarshipPage';
import EventsPage from '../pages/public/EventsPage';
import BookingPage from '../pages/public/BookingPage';
import ContactPage from '../pages/public/ContactPage';
import PortalsPage from '../pages/public/PortalsPage';
import StudentDashboardPage from '../pages/public/StudentDashboardPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import AdminLandingPage from '../pages/admin/AdminLandingPage';
import TeacherDashboardPage from '../pages/admin/TeacherDashboardPage';
import StaffDashboardPage from '../pages/admin/StaffDashboardPage';
import NotificationCenterPage from '../pages/admin/NotificationCenterPage';
import AccessControlPage from '../pages/admin/AccessControlPage';
import CmsStudioPage from '../pages/admin/CmsStudioPage';
import {
  ACCESS_CONTROL_VIEW_ROLES,
  ADMIN_PANEL_ROLES,
  CMS_STUDIO_ROLES,
  STAFF_DASHBOARD_ROLES,
  STUDENT_DASHBOARD_ROLES,
  TEACHER_DASHBOARD_ROLES
} from '../constants/roles';

function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/blogs" element={<BlogsPage />} />
        <Route path="/blogs/:slug" element={<BlogDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/pages" element={<PagesPage />} />
        <Route path="/pages/:slug" element={<DynamicPageView />} />
        <Route path="/scholarship" element={<ScholarshipPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/portals" element={<PortalsPage />} />
        <Route
          path="/student"
          element={
            <RoleGuard roles={STUDENT_DASHBOARD_ROLES} loginPath="/login/student">
              <StudentDashboardPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/:portal" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/admin"
        element={
          <RoleGuard roles={ADMIN_PANEL_ROLES} loginPath="/login/admin">
            <AdminLayout />
          </RoleGuard>
        }
      >
        <Route index element={<AdminLandingPage />} />
        <Route
          path="teacher"
          element={
            <RoleGuard roles={TEACHER_DASHBOARD_ROLES} loginPath="/login/teacher">
              <TeacherDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="staff"
          element={
            <RoleGuard roles={STAFF_DASHBOARD_ROLES} loginPath="/login/staff">
              <StaffDashboardPage />
            </RoleGuard>
          }
        />
        <Route path="notifications" element={<NotificationCenterPage />} />
        <Route
          path="cms"
          element={
            <RoleGuard roles={CMS_STUDIO_ROLES} loginPath="/login/teacher">
              <CmsStudioPage />
            </RoleGuard>
          }
        />
        <Route
          path="access"
          element={
            <RoleGuard roles={ACCESS_CONTROL_VIEW_ROLES} loginPath="/login/admin">
              <AccessControlPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
