import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../../api/modules';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FilterBar from '../../components/ui/FilterBar';
import SkeletonList from '../../components/ui/SkeletonList';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import useDebounce from '../../hooks/useDebounce';
import { ALL_ROLES, ROLES } from '../../constants/roles';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime, toLocalizedText } from '../../utils/localized';

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.STUDENT]: 'Student',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.REVIEWER]: 'Reviewer'
};

const T = {
  title: { en: 'Access Control', bn: 'অ্যাক্সেস নিয়ন্ত্রণ' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  lead: {
    en: 'New registrations are Student by default. Elevated roles are assigned here by Admin users.',
    bn: 'নতুন রেজিস্ট্রেশন ডিফল্টভাবে শিক্ষার্থী। উচ্চতর ভূমিকা এখানে অ্যাডমিন ব্যবহারকারীগণ বরাদ্দ করেন।'
  },
  userDirectory: { en: 'User Directory', bn: 'ব্যবহারকারী তালিকা' },
  searchPlaceholder: { en: 'Search by name/email/department', bn: 'নাম/ইমেইল/বিভাগ দিয়ে খুঁজুন' },
  allRoles: { en: 'All roles', bn: 'সব ভূমিকা' },
  allStatus: { en: 'All status', bn: 'সব অবস্থা' },
  active: { en: 'Active', bn: 'সক্রিয়' },
  inactive: { en: 'Inactive', bn: 'নিষ্ক্রিয়' },
  activeLower: { en: 'active', bn: 'সক্রিয়' },
  inactiveLower: { en: 'inactive', bn: 'নিষ্ক্রিয়' },
  noUsers: { en: 'No users found for current filters.', bn: 'বর্তমান ফিল্টারে কোনো ব্যবহারকারী পাওয়া যায়নি।' },
  colUser: { en: 'User', bn: 'ব্যবহারকারী' },
  colDepartment: { en: 'Department', bn: 'বিভাগ' },
  colStatus: { en: 'Status', bn: 'অবস্থা' },
  colCurrentRoles: { en: 'Current Roles', bn: 'বর্তমান ভূমিকা' },
  colLastLogin: { en: 'Last Login', bn: 'সর্বশেষ লগইন' },
  colRoleControls: { en: 'Role Controls', bn: 'ভূমিকা নিয়ন্ত্রণ' },
  saveRoles: { en: 'Save Roles', bn: 'ভূমিকা সংরক্ষণ' },
  deactivate: { en: 'Deactivate', bn: 'নিষ্ক্রিয় করুন' },
  reactivate: { en: 'Reactivate', bn: 'পুনঃসক্রিয় করুন' },
  deactivateTitle: { en: 'Deactivate account', bn: 'অ্যাকাউন্ট নিষ্ক্রিয় করুন' },
  reactivateTitle: { en: 'Reactivate account', bn: 'অ্যাকাউন্ট পুনঃসক্রিয় করুন' },
  msgLoadFailed: { en: 'Failed to load user access records.', bn: 'ব্যবহারকারী অ্যাক্সেস রেকর্ড লোড করতে ব্যর্থ।' },
  msgStatusFailed: { en: 'Failed to update account status.', bn: 'অ্যাকাউন্টের অবস্থা আপডেট করতে ব্যর্থ।' },
  msgKeepRole: { en: 'Each user must keep at least one role.', bn: 'প্রত্যেক ব্যবহারকারীকে অন্তত একটি ভূমিকা রাখতে হবে।' },
  msgRolesFailed: { en: 'Failed to update user roles.', bn: 'ব্যবহারকারীর ভূমিকা আপডেট করতে ব্যর্থ।' }
};

function compareRoles(left = [], right = []) {
  const leftValue = [...left].sort().join('|');
  const rightValue = [...right].sort().join('|');
  return leftValue === rightValue;
}

function AccessControlPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const canManageRoles = useRole(ROLES.ADMIN);
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: ''
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  const queryParams = useMemo(() => {
    const isActive = filters.isActive === '' ? undefined : filters.isActive === 'true';

    return {
      search: debouncedSearch || undefined,
      role: filters.role || undefined,
      isActive,
      limit: 100
    };
  }, [debouncedSearch, filters.isActive, filters.role]);

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
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const nextRoles = hasRole ? current.filter((item) => item !== role) : [...current, role];

      return {
        ...prev,
        [userId]: nextRoles
      };
    });
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) {
      return;
    }

    setStatusBusy(true);
    setError('');
    setMessage('');

    try {
      await authApi.updateUserStatus(statusTarget.id, { isActive: !statusTarget.isActive });
      setMessage(
        statusTarget.isActive
          ? toLocalizedText(
              {
                en: `Deactivated ${statusTarget.fullName}. Their sessions have been revoked.`,
                bn: `${statusTarget.fullName} নিষ্ক্রিয় করা হয়েছে। তাদের সেশন বাতিল হয়েছে।`
              },
              language
            )
          : toLocalizedText(
              {
                en: `Reactivated ${statusTarget.fullName}.`,
                bn: `${statusTarget.fullName} পুনঃসক্রিয় করা হয়েছে।`
              },
              language
            )
      );
      setStatusTarget(null);
      await loadUsers();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgStatusFailed')));
      setStatusTarget(null);
    } finally {
      setStatusBusy(false);
    }
  };

  const saveRoles = async (user) => {
    const roles = draftRoles[user.id] || [];

    if (!roles.length) {
      setError(t('msgKeepRole'));
      return;
    }

    setError('');
    setMessage('');

    try {
      await authApi.updateUserRoles(user.id, { roles });
      setMessage(
        toLocalizedText(
          {
            en: `Updated roles for ${user.fullName}.`,
            bn: `${user.fullName}-এর ভূমিকা আপডেট করা হয়েছে।`
          },
          language
        )
      );
      await loadUsers();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgRolesFailed')));
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{t('title')}</h1>
        <button type="button" className="btn btn-ghost" onClick={loadUsers}>
          {t('refresh')}
        </button>
      </div>

      <p className="meta">{t('lead')}</p>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>{t('userDirectory')}</h3>
          <FilterBar
            searchValue={filters.search}
            searchPlaceholder={t('searchPlaceholder')}
            onSearchChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          >
            <select
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
            >
              <option value="">{t('allRoles')}</option>
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
              <option value="">{t('allStatus')}</option>
              <option value="true">{t('active')}</option>
              <option value="false">{t('inactive')}</option>
            </select>
          </FilterBar>
        </div>

        {loading && <SkeletonList count={3} lines={4} />}
        {!loading && !users.length && <p>{t('noUsers')}</p>}

        {!!users.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('colUser')}</th>
                  <th>{t('colDepartment')}</th>
                  <th>{t('colStatus')}</th>
                  <th>{t('colCurrentRoles')}</th>
                  <th>{t('colLastLogin')}</th>
                  {canManageRoles && <th>{t('colRoleControls')}</th>}
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
                          {item.isActive ? t('activeLower') : t('inactiveLower')}
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
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={!changed}
                              onClick={() => saveRoles(item)}
                            >
                              {t('saveRoles')}
                            </button>
                            {item.id !== currentUser?.id && (
                              <button
                                type="button"
                                className={`btn ${item.isActive ? 'btn-danger btn-sm' : 'btn-ghost'}`}
                                onClick={() => setStatusTarget(item)}
                              >
                                {item.isActive ? t('deactivate') : t('reactivate')}
                              </button>
                            )}
                          </div>
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

      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        title={statusTarget?.isActive ? t('deactivateTitle') : t('reactivateTitle')}
        message={
          statusTarget?.isActive
            ? toLocalizedText(
                {
                  en: `${statusTarget?.fullName} (${statusTarget?.email}) will no longer be able to sign in, and their active sessions will be revoked immediately.`,
                  bn: `${statusTarget?.fullName} (${statusTarget?.email}) আর সাইন ইন করতে পারবেন না, এবং তাদের সক্রিয় সেশন তৎক্ষণাৎ বাতিল হবে।`
                },
                language
              )
            : toLocalizedText(
                {
                  en: `${statusTarget?.fullName} (${statusTarget?.email}) will be able to sign in again.`,
                  bn: `${statusTarget?.fullName} (${statusTarget?.email}) আবার সাইন ইন করতে পারবেন।`
                },
                language
              )
        }
        confirmLabel={statusTarget?.isActive ? t('deactivate') : t('reactivate')}
        tone={statusTarget?.isActive ? 'danger' : 'primary'}
        busy={statusBusy}
      />
    </section>
  );
}

export default AccessControlPage;
