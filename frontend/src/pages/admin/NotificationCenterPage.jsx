import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, notificationApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function NotificationCenterPage() {
  const { user } = useAuth();
  const canDispatch = useRole('admin', 'manager');
  const { success, error: toastError, info } = useToast();
  const latestNotificationIdRef = useRef('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    status: '',
    channel: ''
  });

  const [userSearch, setUserSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const resp = await authApi.getUsers();
      setUsers(resp.data?.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.channel) params.channel = filters.channel;
      const resp = await notificationApi.getNotifications(params);
      const data = resp.data?.notifications || [];
      setNotifications(data);
      if (data.length > 0) {
        latestNotificationIdRef.current = data[0]._id;
      }
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
    fetchNotifications();
  }, [fetchUsers, fetchNotifications]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!message) return;
    try {
      await notificationApi.dispatch({
        message,
        targetUsers: userSearch ? [userSearch] : [],
        channel: 'all'
      });
      setMessage('');
      setUserSearch('');
      success('Notification dispatched successfully');
      fetchNotifications();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return [];
    return users.filter(u => 
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Notification Center</h1>
      
      {canDispatch && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold mb-4">Send New Notification</h2>
          <form onSubmit={handleDispatch}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea 
                className="w-full border rounded p-2"
                rows="3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message..."
                required
              />
            </div>
            <div className="mb-4 relative">
              <label className="block text-sm font-medium mb-1">Target User (Optional - Leave blank for all)</label>
              <input 
                type="text"
                className="w-full border rounded p-2"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
              />
              {userSearch && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <div 
                      key={u._id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setUserSearch(u.email)}
                    >
                      {u.fullName} ({u.email})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Dispatch Notification
            </button>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sent Notifications</h2>
          <div className="flex gap-2">
            <select 
              className="border rounded p-1"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : errorMessage ? (
          <p className="text-red-500">{errorMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-bottom">
                  <th className="p-2">Message</th>
                  <th className="p-2">Channel</th>
                  <th className="p-2">Recipients</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(n => (
                  <tr key={n._id} className="border-t">
                    <td className="p-2">{n.message}</td>
                    <td className="p-2 capitalize">{n.channel}</td>
                    <td className="p-2">{n.targetUsers?.length || 'Global'}</td>
                    <td className="p-2 text-sm">{toLocalDateTime(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationCenterPage;
