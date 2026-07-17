import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import WorkspaceLayout from '../components/layout/WorkspaceLayout';
import DeskLayout from '../components/layout/DeskLayout';
import RoleGuard from '../components/layout/RoleGuard';
import HomePage from '../pages/public/HomePage';
import NewsPage from '../pages/public/NewsPage';
import NewsDetailPage from '../pages/public/NewsDetailPage';
import AnnouncementsPage from '../pages/public/AnnouncementsPage';
import BlogsPage from '../pages/public/BlogsPage';
import BlogDetailPage from '../pages/public/BlogDetailPage';
import GalleryPage from '../pages/public/GalleryPage';
import GalleryDetailPage from '../pages/public/GalleryDetailPage';
import PagesPage from '../pages/public/PagesPage';
import DynamicPageView from '../pages/public/DynamicPageView';
import ScholarshipPage from '../pages/public/ScholarshipPage';
import SearchPage from '../pages/public/SearchPage';
import EventsPage from '../pages/public/EventsPage';
import BookingPage from '../pages/public/BookingPage';
import ContactPage from '../pages/public/ContactPage';
import ProfilePage from '../pages/ProfilePage';
import PortalsPage from '../pages/public/PortalsPage';
import StudentDashboardPage from '../pages/workspace/StudentDashboardPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
// Signed-in workspace pages (pages/workspace) are lazy-loaded so public
// visitors never download them.
const AdminLandingPage = lazy(() => import('../pages/workspace/AdminLandingPage'));
const TeacherDashboardPage = lazy(() => import('../pages/workspace/TeacherDashboardPage'));
const StaffDashboardPage = lazy(() => import('../pages/workspace/StaffDashboardPage'));
const NotificationCenterPage = lazy(() => import('../pages/workspace/NotificationCenterPage'));
const AccessControlPage = lazy(() => import('../pages/workspace/AccessControlPage'));
const CmsStudioPage = lazy(() => import('../pages/workspace/CmsStudioPage'));
import {
  ACCESS_CONTROL_VIEW_ROLES,
  ADMIN_PANEL_ROLES,
  CMS_STUDIO_ROLES,
  NOTIFICATION_CENTER_ROLES,
  STAFF_DASHBOARD_ROLES,
  STUDENT_DASHBOARD_ROLES,
  TEACHER_DASHBOARD_ROLES
} from '../constants/roles';
import NotFoundPage from '../pages/NotFoundPage';

function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="route-loading" role="status" aria-live="polite">
          Loading…
        </div>
      }
    >
      <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:newsId" element={<NewsDetailPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/blogs" element={<BlogsPage />} />
        <Route path="/blogs/:slug" element={<BlogDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/gallery/:galleryId" element={<GalleryDetailPage />} />
        <Route path="/pages" element={<PagesPage />} />
        <Route path="/pages/:slug" element={<DynamicPageView />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/portals" element={<PortalsPage />} />
        <Route
          path="/profile"
          element={
            <RoleGuard loginPath="/portals">
              <ProfilePage />
            </RoleGuard>
          }
        />
      </Route>

      {/* Shared desks: public header for visitors, workspace bar when signed in. */}
      <Route element={<DeskLayout />}>
        <Route path="/scholarship" element={<ScholarshipPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/booking" element={<BookingPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/:portal" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <RoleGuard roles={STUDENT_DASHBOARD_ROLES} loginPath="/login/student">
            <WorkspaceLayout />
          </RoleGuard>
        }
      >
        <Route path="/student" element={<StudentDashboardPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RoleGuard roles={ADMIN_PANEL_ROLES} loginPath="/login/admin">
            <WorkspaceLayout />
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
        <Route
          path="notifications"
          element={
            <RoleGuard roles={NOTIFICATION_CENTER_ROLES} loginPath="/login/admin">
              <NotificationCenterPage />
            </RoleGuard>
          }
        />
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

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
