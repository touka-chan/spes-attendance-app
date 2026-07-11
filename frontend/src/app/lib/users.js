const API_URL = 'https://spes-attendance-app.onrender.com/api';

export async function authenticateUser(email, password, captchaToken = null, totpCode = null) {
  const body = { email, password };
  if (captchaToken) body.captcha_token = captchaToken;
  if (totpCode) body.totp_code = totpCode;

  const res = await fetch(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    // Return the error data so the caller can handle specific cases
    return { error: data };
  }

  return {
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    token: data.token,
    expiresIn: data.expires_in,
    expiresAt: data.expires_at,
    requireCaptcha: data.require_captcha,
    require2fa: data.require_2fa,
    locked: data.locked,
    lockoutMinutes: data.lockout_minutes,
    siteKey: data.site_key,
  };
}

// Check if CAPTCHA/2FA is required for an email (call on page load)
export async function checkLoginRequirements(email) {
  const res = await fetch(`${API_URL}/login/requirements/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    return { requireCaptcha: false, require2fa: false, siteKey: '' };
  }

  return res.json();
}
