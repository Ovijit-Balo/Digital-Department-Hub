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

// The `editor` role is surfaced to users as "Teacher"; internally the role
// value stays `editor` across the stack.
const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Teacher',
  [ROLES.STUDENT]: 'Student',
  [ROLES.MANAGER]: 'Staff',
  [ROLES.REVIEWER]: 'Scholarship Reviewer'
};

// Plain-language explanation of what each role can do, shown next to the invite
// toggles so admins pick the right one instead of guessing from the label.
const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: {
    en: 'Full control: manage users, roles, invitations, and every desk.',
    bn: 'পূর্ণ নিয়ন্ত্রণ: ব্যবহারকারী, ভূমিকা, আমন্ত্রণ ও সব ডেস্ক পরিচালনা।'
  },
  [ROLES.EDITOR]: {
    en: 'Teacher desk: publish news, blogs, pages, events, and gallery content.',
    bn: 'শিক্ষক ডেস্ক: সংবাদ, ব্লগ, পৃষ্ঠা, ইভেন্ট ও গ্যালারি প্রকাশ করা।'
  },
  [ROLES.MANAGER]: {
    en: 'Staff desk: inquiries, venue bookings, notifications, and scholarship document verification.',
    bn: 'স্টাফ ডেস্ক: অনুসন্ধান, ভেন্যু বুকিং, নোটিফিকেশন ও বৃত্তির নথি যাচাই।'
  },
  [ROLES.REVIEWER]: {
    en: 'Add-on for a teacher: academically evaluates and shortlists scholarship applications (cannot apply or award).',
    bn: 'শিক্ষকের অতিরিক্ত ভূমিকা: বৃত্তির আবেদন একাডেমিকভাবে মূল্যায়ন ও সংক্ষিপ্ত তালিকাভুক্ত করা (আবেদন বা পুরস্কার নয়)।'
  },
  [ROLES.STUDENT]: {
    en: 'Standard account: scholarships, event registration, and personal desk.',
    bn: 'সাধারণ অ্যাকাউন্ট: বৃত্তি, ইভেন্ট নিবন্ধন ও ব্যক্তিগত ডেস্ক।'
  }
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
  msgRolesFailed: { en: 'Failed to update user roles.', bn: 'ব্যবহারকারীর ভূমিকা আপডেট করতে ব্যর্থ।' },
  inviteHeading: { en: 'Invite a Team Member', bn: 'একজন সদস্যকে আমন্ত্রণ জানান' },
  inviteLead: {
    en: 'Send an email invitation to create an elevated account. The recipient sets their own name and password; the role(s) you pick here are assigned automatically.',
    bn: 'উচ্চতর অ্যাকাউন্ট তৈরির জন্য ইমেইল আমন্ত্রণ পাঠান। প্রাপক নিজের নাম ও পাসওয়ার্ড ঠিক করবেন; আপনি এখানে যে ভূমিকা বাছবেন তা স্বয়ংক্রিয়ভাবে বরাদ্দ হবে।'
  },
  inviteEmail: { en: 'Email address', bn: 'ইমেইল ঠিকানা' },
  inviteName: { en: 'Full name (optional)', bn: 'পুরো নাম (ঐচ্ছিক)' },
  inviteDept: { en: 'Department (optional)', bn: 'বিভাগ (ঐচ্ছিক)' },
  inviteRoles: { en: 'Roles to assign', bn: 'বরাদ্দযোগ্য ভূমিকা' },
  inviteSend: { en: 'Send Invitation', bn: 'আমন্ত্রণ পাঠান' },
  inviteSending: { en: 'Sending…', bn: 'পাঠানো হচ্ছে…' },
  inviteEmailRequired: { en: 'Enter a valid email address.', bn: 'একটি বৈধ ইমেইল ঠিকানা লিখুন।' },
  inviteRoleRequired: { en: 'Select at least one role.', bn: 'অন্তত একটি ভূমিকা নির্বাচন করুন।' },
  inviteFailed: { en: 'Failed to send invitation.', bn: 'আমন্ত্রণ পাঠাতে ব্যর্থ।' },
  inviteSent: { en: 'Invitation sent to', bn: 'আমন্ত্রণ পাঠানো হয়েছে' },
  pendingHeading: { en: 'Pending Invitations', bn: 'অপেক্ষমাণ আমন্ত্রণ' },
  noPending: { en: 'No pending invitations.', bn: 'কোনো অপেক্ষমাণ আমন্ত্রণ নেই।' },
  colExpires: { en: 'Expires', bn: 'মেয়াদ শেষ' },
  revoke: { en: 'Revoke', bn: 'বাতিল করুন' },
  revoked: { en: 'Invitation revoked.', bn: 'আমন্ত্রণ বাতিল করা হয়েছে।' },
  revokeFailed: { en: 'Failed to revoke invitation.', bn: 'আমন্ত্রণ বাতিল করতে ব্যর্থ।' }
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

  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    department: '',
    roles: [ROLES.EDITOR]
  });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [invitations, setInvitations] = useState([]);

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

  const loadInvitations = useCallback(async () => {
    if (!canManageRoles) {
      return;
    }
    try {
      const response = await authApi.listInvitations({ status: 'pending', limit: 100 });
      setInvitations(response.data.items || []);
    } catch {
      // Non-fatal: the directory is still usable without the pending list.
      setInvitations([]);
    }
  }, [canManageRoles]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const toggleInviteRole = (role) => {
    setInviteForm((prev) => {
      const has = prev.roles.includes(role);
      const nextRoles = has
        ? prev.roles.filter((item) => item !== role)
        : [...prev.roles, role];
      return { ...prev, roles: nextRoles };
    });
  };

  const sendInvitation = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const email = inviteForm.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('inviteEmailRequired'));
      return;
    }
    if (!inviteForm.roles.length) {
      setError(t('inviteRoleRequired'));
      return;
    }

    setInviteBusy(true);
    try {
      await authApi.createInvitation({
        email,
        roles: inviteForm.roles,
        fullName: inviteForm.fullName.trim() || undefined,
        department: inviteForm.department.trim() || undefined
      });
      setMessage(`${t('inviteSent')} ${email}.`);
      setInviteForm({ email: '', fullName: '', department: '', roles: [ROLES.EDITOR] });
      await loadInvitations();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('inviteFailed')));
    } finally {
      setInviteBusy(false);
    }
  };

  const revokeInvitation = async (invitationId) => {
    setError('');
    setMessage('');
    try {
      await authApi.revokeInvitation(invitationId);
      setMessage(t('revoked'));
      await loadInvitations();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('revokeFailed')));
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

      {canManageRoles && (
        <article className="surface-card">
          <h3>{t('inviteHeading')}</h3>
          <p className="meta">{t('inviteLead')}</p>

          <form className="invite-form" onSubmit={sendInvitation}>
            <div className="invite-form__grid">
              <label>
                {t('inviteEmail')}
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                {t('inviteName')}
                <input
                  type="text"
                  maxLength={120}
                  value={inviteForm.fullName}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                />
              </label>
              <label>
                {t('inviteDept')}
                <input
                  type="text"
                  maxLength={120}
                  value={inviteForm.department}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, department: event.target.value }))
                  }
                />
              </label>
            </div>

            <fieldset className="invite-form__roles">
              <legend>{t('inviteRoles')}</legend>
              <div className="role-toggle-grid role-toggle-grid--described">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="role-toggle-item role-toggle-item--described">
                    <input
                      type="checkbox"
                      checked={inviteForm.roles.includes(role)}
                      onChange={() => toggleInviteRole(role)}
                    />
                    <span className="role-toggle-item__text">
                      <span className="role-toggle-item__name">{ROLE_LABELS[role]}</span>
                      <span className="role-toggle-item__hint">
                        {toLocalizedText(ROLE_DESCRIPTIONS[role], language)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" className="btn btn-primary" disabled={inviteBusy}>
              {inviteBusy ? t('inviteSending') : t('inviteSend')}
            </button>
          </form>

          <div className="section-head section-head-tight">
            <h4>{t('pendingHeading')}</h4>
          </div>
          {!invitations.length && <p className="meta">{t('noPending')}</p>}
          {!!invitations.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('inviteEmail')}</th>
                    <th>{t('colCurrentRoles')}</th>
                    <th>{t('colExpires')}</th>
                    <th aria-label={t('revoke')} />
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => (
                    <tr key={invite.id}>
                      <td>{invite.email}</td>
                      <td>
                        {(invite.roles || [])
                          .map((role) => ROLE_LABELS[role] || role)
                          .join(', ')}
                      </td>
                      <td>{toLocalDateTime(invite.expiresAt, language)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => revokeInvitation(invite.id)}
                        >
                          {t('revoke')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

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
