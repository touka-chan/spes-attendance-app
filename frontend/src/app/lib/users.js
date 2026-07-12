const API_URL = 'https://spes-attendance-app.onrender.com/api';

export async function authenticateUser(email, password) {
  const body = { email, password };

  const res = await fetch(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: data };
  }

  return {
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    token: data.token,
    expiresIn: data.expires_in,
    expiresAt: data.expires_at,
  };
}
