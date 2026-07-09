import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

function PublicLayout() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="public-content">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default PublicLayout;
