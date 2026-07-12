"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './login.module.css';
import Image from 'next/image';
import { authenticateUser, checkLoginRequirements } from './lib/users';
import { forgotPassword } from './lib/api';

export default function Login() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [checkingRequirements, setCheckingRequirements] = useState(true);

  const emailRef = useRef();
  const passwordRef = useRef();
  const twoFaVerifiedRef = useRef(null);

  // Check security requirements on page load and email change
  useEffect(() => {
    // Check if returning from 2FA verification on challenge page
    const urlParams = new URLSearchParams(window.location.search);
    const twoFaVerified = urlParams.get('2fa_verified');
    twoFaVerifiedRef.current = twoFaVerified;

    // Clean URL params to avoid stale state
    if (twoFaVerified || urlParams.toString()) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    checkRequirements();
  }, []);

  const checkRequirements = async () => {
    const email = emailRef.current?.value || '';
    if (!email) {
      setCheckingRequirements(false);
      return;
    }

    try {
      const reqs = await checkLoginRequirements(email);
      if (reqs.locked) {
        const params = new URLSearchParams({
          type: 'locked',
          email: email,
          minutes: reqs.lockout_minutes || 5,
          redirect: '/'
        });
        window.location.href = `/challenge?${params.toString()}`;
        return;
      }
      if (reqs.require_captcha) {
        const params = new URLSearchParams({
          type: 'captcha',
          email: email,
          site_key: reqs.site_key || '',
          redirect: '/'
        });
        window.location.href = `/challenge?${params.toString()}`;
        return;
      }
      if (reqs.require_2fa) {
        const params = new URLSearchParams({
          type: '2fa',
          email: email,
          redirect: '/'
        });
        window.location.href = `/challenge?${params.toString()}`;
        return;
      }
    } catch (err) {
      console.error('Failed to check requirements:', err);
    } finally {
      setCheckingRequirements(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    const twoFaVerifiedFor = twoFaVerifiedRef.current;

    try {
      const result = await authenticateUser(email, password, null, null, twoFaVerifiedFor === email ? email : null);

      if (result.error) {
        const data = result.error;

        if (data.locked) {
          const params = new URLSearchParams({
            type: 'locked',
            email: email,
            minutes: data.lockout_minutes || data.lockoutMinutes || 5,
            redirect: '/'
          });
          window.location.href = `/challenge?${params.toString()}`;
          return;
        }

        if (data.require_captcha || data.requireCaptcha) {
          const params = new URLSearchParams({
            type: 'captcha',
            email: email,
            site_key: data.site_key || data.siteKey || '',
            redirect: '/'
          });
          window.location.href = `/challenge?${params.toString()}`;
          return;
        }

        if (data.require_2fa || data.require2fa) {
          const params = new URLSearchParams({
            type: '2fa',
            email: email,
            redirect: '/'
          });
          window.location.href = `/challenge?${params.toString()}`;
          return;
        }

        setError(data.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // Success
      localStorage.removeItem('attendanceClock');
      localStorage.setItem('spesToken', result.token);
      localStorage.setItem('spesAuth', JSON.stringify({
        role: result.role,
        name: result.name,
        email: result.email,
        loginTime: new Date().toISOString(),
        expiresIn: result.expiresIn,
        expiresAt: result.expiresAt,
      }));

      const dest = result.role === 'admin' ? '/admin' : '/dashboard';
      window.location.href = dest;
    } catch (err) {
      setError('Connection error. Make sure the server is running.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  const handleForgotSubmit = async () => {
    setForgotSending(true);
    setForgotMsg('');
    setForgotError('');
    try {
      const res = await forgotPassword(forgotEmail);
      setForgotMsg(res.message);
    } catch (e) {
      setForgotError(e.message);
    }
    setForgotSending(false);
  };

  return (
    <div className={styles.splitLayout}>
      <div className={styles.leftPanel}>
        <div className={styles.bgOverlay}></div>
        <div className={styles.watermark}>
          <Image src="/speslogo.png" alt="Spes Logo Watermark" width={600} height={600} style={{ opacity: 0.4 }} />
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <h1>Welcome to <br/><span className={styles.brandName}>SpesAttendance</span></h1>
            <p>Spes Attendance Management System</p>
          </div>

          <div className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">mail</span>
                <input type="email" ref={emailRef} placeholder="Email Address" onKeyDown={handleKeyDown} onBlur={() => { if (!checkingRequirements) checkRequirements(); }} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">lock</span>
                <input
                  type={passwordVisible ? "text" : "password"}
                  ref={passwordRef}
                  placeholder="••••••••••••"
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className={styles.visibilityBtn}
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  <span className="material-symbols-outlined">
                    {passwordVisible ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
            <a href="#" className={styles.forgotPassword} onClick={e => { e.preventDefault(); setShowForgot(true); setForgotEmail(''); setForgotMsg(''); setForgotError(''); }}>Forgot Password?</a>
            <button type="button" className={styles.submitBtn} onClick={handleLogin} disabled={loading || checkingRequirements}>
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </div>

          <div className={styles.footerLinks}>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
              Admin: admin@spes.com / User: user@spes.com
            </p>
          </div>
        </div>
      </div>

      {showForgot && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowForgot(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12, padding: 32, width: 400,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0' }}>Forgot Password</h3>
            <p style={{ fontSize: 14, color: 'var(--secondary)', margin: '0 0 20px 0' }}>
              Enter your email and we'll send a new password.
            </p>
            <input type="email" placeholder="Email Address" value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              style={{
                width: '100%', height: 44, padding: '0 12px', boxSizing: 'border-box',
                border: '1px solid var(--outline-variant)', borderRadius: 8, fontSize: 14,
                fontFamily: 'inherit', marginBottom: 16
              }} />
            {forgotMsg && <p style={{ fontSize: 13, color: 'var(--success)', margin: '0 0 12px 0' }}>{forgotMsg}</p>}
            {forgotError && <p style={{ fontSize: 13, color: 'var(--error)', margin: '0 0 12px 0' }}>{forgotError}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className={styles.visibilityBtn} onClick={() => setShowForgot(false)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleForgotSubmit} disabled={forgotSending}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)',
                  color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                  opacity: forgotSending ? 0.6 : 1
                }}>
                {forgotSending ? 'SENDING...' : 'SEND'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}