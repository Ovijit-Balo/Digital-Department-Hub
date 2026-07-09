import { useAuth } from '../../context/AuthContext';
import { getPrimaryPortalForUser } from '../../constants/roles';
import PublicLayout from './PublicLayout';
import WorkspaceLayout from './WorkspaceLayout';

/**
 * Adaptive shell for pages shared between the public site and signed-in
 * workspaces (Scholarships, Events, Booking). A signed-in user with a workspace
 * portal stays inside the workspace top bar; everyone else gets the public
 * header. Same route, same page component — only the surrounding chrome differs.
 */
function DeskLayout() {
  const { user } = useAuth();
  const primaryPortal = getPrimaryPortalForUser(user);

  return primaryPortal ? <WorkspaceLayout /> : <PublicLayout />;
}

export default DeskLayout;
