const API_URL = 'https://spes-attendance-app.onrender.com/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('spesToken');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Status ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('spesToken');
      localStorage.removeItem('spesAuth');
      if (typeof window !== 'undefined') window.location.href = '/';
    }
    throw new Error(data.message || data.detail || JSON.stringify(data));
  }

  return data;
}

export { request };

export function login(email, password) {
  return request('/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request('/logout/', { method: 'POST' });
}

export function getUser() {
  return request('/user/');
}

export function clockIn() {
  return request('/attendance/clock-in/', { method: 'POST' });
}

export function clockOut() {
  return request('/attendance/clock-out/', { method: 'POST' });
}

export function getHistory() {
  return request('/attendance/history/');
}

export function getActiveSession() {
  return request('/attendance/active/');
}

export function getSettings() {
  return request('/admin/settings/');
}

export function forgotPassword(email) {
  return request('/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function updateSettings(data) {
  return request('/admin/settings/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getEmployees() {
  return request('/admin/employees/');
}

export function createEmployee(data) {
  return request('/admin/employees/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateEmployee(id, data) {
  return request(`/admin/employees/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteEmployee(id) {
  return request(`/admin/employees/${id}/`, {
    method: 'DELETE',
  });
}

export function getAdminAnalytics() {
  return request('/admin/analytics/');
}

export function getUserAnalytics() {
  return request('/user/analytics/');
}
