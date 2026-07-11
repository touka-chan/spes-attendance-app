const API_URL = 'https://spes-attendance-app.onrender.com/api';

export async function authenticateUser(email, password) {
  const res = await fetch(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return null;
  }

  return {
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    token: data.token,
  };
}
