import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../../api/modules';
import useRole from '../../hooks/useRole';
import { ALL_ROLES, ROLES } from '../../constants/roles';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.STUDENT]: 'Student',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.REVIEWER]: 'Reviewer'
};

function compareRoles(left = [], right = []) {
  const leftValue = [...left].sort().join('|');
  const rightValue = [...right].sort().join('|');
  return leftValue === rightValue;
}

function AccessControlPage() {
  const canManageRoles = useRole(ROLES.ADMIN);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: ''
  });

  const queryParams = useMemo(() => {
    const isActive =
      filters.isActive === '' ? undefined : filters.isActive === 'true';

    return {
      search: filters.search || undefined,
      role: filters.role || undefined,
      isActive,
      limit: 100
    };
  }, [filters.isActive, filters.role, filters.search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authApi.listUsers(queryParams);
      const items = response.data.items || [];
      setUsers(items);

      const roleDraft = {};
      items.forEach((item) => {
        roleDraft[item.id] = Array.isArray(item.roles) ? item.roles : [];
      });
      setDraftRoles(roleDraft);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load user access records.'));
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleRole = (userId, role) => {
    setDraftRoles((prev) => {
      const current = prev[userId] || [];
      const hasRole = current.includes(role);

      if (hasRole && current.length === 1) {
        return prev;
      }

      const nextRoles = hasRole
        ? current.filter((item) => item !== role)
        : [...current, role];

      return {
        ...prev,
        [userId]: nextRoles
      };
    });
  };

  const saveRoles = async (user) => {
    const roles = draftRoles[user.id] || [];

    if (!roles.length) {
      setError('Each user must keep at least one role.');
      return;
    }

    setError('');
    setMessage('');

    try {
      await authApi.updateUserRoles(user.id, { roles });
      setMessage(`Updated roles for ${user.fullName}.`);
      await loadUsers();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to update user roles.'));
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Access Control</h1>
        <button type="button" className="btn btn-ghost" onClick={loadUsers}>
          Refresh
        </button>
      </div>

      <p className="meta">
        New registrations are Student by default. Elevated roles are assigned here by Admin users.
      </p>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>User Directory</h3>
          <div className="action-row">
            <input
              value={filters.search}
              placeholder="Search by name/email/department"
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
            <select
              value={filters.role}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, role: event.target.value }))
              }
            >
              <option value="">All roles</option>
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select
              value={filters.isActive}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, isActive: event.target.value }))
              }
            >
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {loading && <p>Loading users...</p>}
        {!loading && !users.length && <p>No users found for current filters.</p>}

        {!!users.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Current Roles</th>
                  <th>Last Login</th>
                  {canManageRoles && <th>Role Controls</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const selectedRoles = draftRoles[item.id] || item.roles || [];
                  const changed = !compareRoles(selectedRoles, item.roles || []);

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.fullName}</strong>
                        <br />
                        <span className="meta">{item.email}</span>
                      </td>
                      <td>{item.department || '-'}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            item.isActive ? 'status-approved' : 'status-rejected'
                          }`}
                        >
                          {item.isActive ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="role-chip-list">
                          {(item.roles || []).map((role) => (
                            <span key={role} className="role-chip">
                              {ROLE_LABELS[role] || role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{toLocalDateTime(item.lastLoginAt)}</td>
                      {canManageRoles && (
                        <td>
                          <div className="role-toggle-grid">
                            {ALL_ROLES.map((role) => (
                              <label key={role} className="role-toggle-item">
                                <input
                                  type="checkbox"
                                  checked={selectedRoles.includes(role)}
                                  onChange={() => toggleRole(item.id, role)}
                                />
                                <span>{ROLE_LABELS[role]}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={!changed}
                            onClick={() => saveRoles(item)}
                          >
                            Save Roles
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

export default AccessControlPage;
