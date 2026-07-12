const API_URL = 'https://spes-attendance-app.onrender.com/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('spesToken');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  if (!res.ok) return null;
  return data;
}

export function getNotifications() {
  return request('/notifications/');
}

export function markRead(id) {
  return request(`/notifications/${id}/read/`, { method: 'POST' });
}

export function markAllRead() {
  return request('/notifications/read-all/', { method: 'POST' });
}

export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
