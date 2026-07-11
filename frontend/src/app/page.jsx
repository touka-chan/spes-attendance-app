"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './login.module.css';
import Image from 'next/image';
import { authenticateUser, checkLoginRequirements } from './lib/users';
import { forgotPassword } from './lib/api';
import { CaptchaChallenge, TwoFAChallenge } from './lib/SecurityChallenge';

export default function Login() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);
  const [checkingRequirements, setCheckingRequirements] = useState(true);

  const emailRef = useRef();
  const passwordRef = useRef();

  // Check security requirements on page load
  useEffect(() => {
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
      setCaptchaRequired(reqs.requireCaptcha);
      setTwoFARequired(reqs.require2fa);
      setSiteKey(reqs.siteKey || '');
      setLocked(reqs.locked || false);
      setLockoutMinutes(reqs.lockoutMinutes || 0);
    } catch (err) {
      console.error('Failed to check login requirements:', err);
    } finally {
      setCheckingRequirements(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    try {
      const result = await authenticateUser(email, password, captchaToken || null, totpCode || null);

      if (result.error) {
        const data = result.error;
        
        // Handle lockout
        if (data.locked) {
          setLocked(true);
          setLockoutMinutes(data.lockoutMinutes || 0);
          setCaptchaRequired(data.requireCaptcha || false);
          setError(data.message || 'Account locked');
          setLoading(false);
          return;
        }

        // Handle CAPTCHA requirement
        if (data.requireCaptcha) {
          setCaptchaRequired(true);
          setSiteKey(data.siteKey || '');
          setError(data.message || 'CAPTCHA required');
          setLoading(false);
          return;
        }

        // Handle 2FA requirement
        if (data.require2fa) {
          setTwoFARequired(true);
          setError(data.message || '2FA required');
          setLoading(false);
          return;
        }

        setError(data.message || 'Invalid credentials');
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

  const handleCaptchaSuccess = (token) => {
    setCaptchaToken(token);
    setCaptchaRequired(false);
    setError('');
    // Auto-submit after CAPTCHA success
    setTimeout(handleLogin, 100);
  };

  const handleCaptchaError = (err) => {
    setError(err);
    setCaptchaToken('');
  };

  const handle2FASuccess = () => {
    setTwoFARequired(false);
    setError('');
    handleLogin();
  };

  const handle2FAError = (err) => {
    setError(err);
    setTotpCode('');
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

  // Disable login button if checking requirements
  const disableLogin = loading || checkingRequirements || (captchaRequired && !captchaToken) || (twoFARequired && !totpCode);

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
            {locked && (
              <div className={styles.error} style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}>
                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>lock</span>
                Account locked due to multiple failed attempts. Try again in {lockoutMinutes} minute{lockoutMinutes !== 1 ? 's' : ''}.
              </div>
            )}

            {error && !locked && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">mail</span>
                <input type="email" ref={emailRef} placeholder="Email Address" onKeyDown={handleKeyDown} onBlur={checkRequirements} />
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

            {/* CAPTCHA Challenge */}
            {captchaRequired && siteKey && (
              <CaptchaChallenge
                email={emailRef.current?.value}
                siteKey={siteKey}
                onSuccess={(token) => handleCaptchaSuccess(token)}
                onError={(err) => handleCaptchaError(err)}
              />
            )}

            {/* 2FA Challenge */}
            {twoFARequired && (
              <TwoFAChallenge
                email={emailRef.current?.value}
                onSuccess={handle2FASuccess}
                onError={handle2FAError}
              />
            )}

            <a href="#" className={styles.forgotPassword} onClick={e => { e.preventDefault(); setShowForgot(true); setForgotEmail(''); setForgotMsg(''); setForgotError(''); }}>Forgot Password?</a>
            <button type="button" className={styles.submitBtn} onClick={handleLogin} disabled={disableLogin}>
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