"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './challenge.module.css';
import Image from 'next/image';

const FALLBACK_SITE_KEY = '0x4AAAAAADz4Rw2SNZMVKi8i';

export default function ChallengePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [type, setType] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [widgetId, setWidgetId] = useState(null);
  const [captchaError, setCaptchaError] = useState('');
  const [isFresh, setIsFresh] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [widgetTimeout, setWidgetTimeout] = useState(false);
  const captchaHandledRef = useRef(false);

  // Parse URL params and set site key
  useEffect(() => {
    const e = searchParams.get('email') || '';
    const t = searchParams.get('type') || '';
    const k = searchParams.get('site_key') || '';
    const r = searchParams.get('redirect') || '/';
    const f = searchParams.get('fresh') || '';

    setIsFresh(f === '1');
    setEmail(e);
    setType(t);
    setSiteKey(k || FALLBACK_SITE_KEY);
    setRedirectUrl(r);
  }, [searchParams]);

  // Load Turnstile script and track when ready
  useEffect(() => {
    if (window.turnstile) {
      setTurnstileReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    window.onTurnstileLoad = () => setTurnstileReady(true);
    document.head.appendChild(script);
    return () => { delete window.onTurnstileLoad; };
  }, []);

  // Fallback: if widget hasn't rendered after 10s, show retry option
  useEffect(() => {
    if (type !== 'captcha' || widgetId || turnstileReady) return;
    const timer = setTimeout(() => setWidgetTimeout(true), 10000);
    return () => clearTimeout(timer);
  }, [type, widgetId, turnstileReady]);

  const renderWidget = () => {
    if (!window.turnstile || !siteKey || widgetId) return;
    const id = window.turnstile.render('#captcha-widget', {
      sitekey: siteKey,
      theme: 'light',
      callback: (token) => {
        captchaHandledRef.current = true;
        handleCaptchaSuccess(token);
      },
      'expired-callback': () => {
        setCaptchaError('Challenge expired. Please refresh the page.');
      },
      'error-callback': () => {
        setCaptchaError('Verification failed. Please refresh and try again.');
      },
    });
    setWidgetId(id);
    setWidgetTimeout(false);
  };

  // Render Turnstile widget when ready
  useEffect(() => {
    if (turnstileReady && siteKey && type === 'captcha' && !widgetId) {
      renderWidget();
    }
  }, [turnstileReady, siteKey, type, widgetId]);

  // Reset widget when re-shown (e.g. after error)
  useEffect(() => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }, [widgetId, type]);

  const handleCaptchaSuccess = async (token) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://spes-attendance-app.onrender.com/api/verify-challenge/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isFresh ? '' : email,
          captcha_token: token,
          redirect_url: redirectUrl
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (isFresh) {
          // Fresh visit: store in sessionStorage, redirect to login
          sessionStorage.setItem('captcha_verified', 'true');
          window.location.href = redirectUrl;
        } else if (email && !isFresh) {
          // Known user: CAPTCHA/2FA verified, redirect to login
          const searchParams = new URLSearchParams(window.location.search);
          const type = searchParams.get('type');
          let dest = redirectUrl;
          if (type === '2fa') {
            dest = redirectUrl.includes('?') 
              ? `${redirectUrl}&2fa_verified=${encodeURIComponent(email)}`
              : `${redirectUrl}?2fa_verified=${encodeURIComponent(email)}`;
          }
          window.location.href = dest;
        } else {
          window.location.href = redirectUrl;
        }
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message);
      // Reset widget
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://spes-attendance-app.onrender.com/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, totp_code: totpCode }),
      });

      if (res.ok) {
        router.push(redirectUrl);
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Invalid 2FA code');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpChange = (e) => {
    setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
            <p style={{ marginTop: '16px', color: 'var(--secondary)' }}>Verifying...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Image 
            src="/speslogo.png" 
            alt="SPES Logo" 
            width={64} 
            height={64} 
            className={styles.logo}
          />
          <h1>SpesAttendance</h1>
          <p>{type === '2fa' ? 'Two-Factor Authentication' : type === 'locked' ? 'Account Locked' : 'Security Verification'}</p>
        </div>

        {error && <div className={styles.error}>
          <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>error</span>
          {error}
        </div>}

        {/* CAPTCHA Challenge */}
        {type === 'captcha' && (
          <div className={styles.challengeBox}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)' }}>shield</span>
              <h3 style={{ margin: '12px 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Verify you're human</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--secondary)' }}>
                {widgetId ? 'Please complete the CAPTCHA below' : 'Loading verification...'}
              </p>
            </div>
            
            {!widgetId && !widgetTimeout && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <div className={styles.spinner}></div>
              </div>
            )}
            
            <div id="captcha-widget" style={{ display: widgetId ? 'inline-block' : 'none' }}></div>
            
            {widgetTimeout && !widgetId && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <p style={{ color: '#856404', background: '#fff3cd', padding: '12px', borderRadius: '8px', border: '1px solid #ffc107', fontSize: '14px' }}>
                  Failed to load CAPTCHA. Please check your connection and try again.
                </p>
                <button onClick={() => { setWidgetTimeout(false); renderWidget(); }} className={styles.verifyBtn} style={{ marginTop: '12px' }}>
                  Retry
                </button>
                {isFresh && (
                  <button onClick={() => {
                    sessionStorage.setItem('captcha_verified', 'true');
                    window.location.href = redirectUrl;
                  }} className={styles.verifyBtn} style={{ marginTop: '8px', background: 'var(--secondary)' }}>
                    Continue to Login
                  </button>
                )}
              </div>
            )}
            
            {captchaError && (
              <p className={styles.captchaError}>
                <span className="material-symbols-outlined">error</span>
                {captchaError}
              </p>
            )}

            <button 
              onClick={() => {
                if (widgetId && window.turnstile) {
                  window.turnstile.execute(widgetId);
                }
              }}
              disabled={loading || !widgetId}
              className={styles.verifyBtn}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        )}

        {/* 2FA Challenge */}
        {type === '2fa' && (
          <form onSubmit={handle2FASubmit} className={styles.challengeBox}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)' }}>security</span>
              <h3 style={{ margin: '12px 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Two-Factor Authentication</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--secondary)' }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '28px',
                letterSpacing: '10px',
                textAlign: 'center',
                border: '1px solid var(--outline-variant)',
                borderRadius: '10px',
                background: 'var(--surface)',
                color: 'var(--on-surface)',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
              autoFocus
              disabled={loading}
            />

            {error && <p className={styles.error}>{error}</p>}

            <button 
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className={styles.verifyBtn}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <p style={{ margin: '20px 0 0 0', fontSize: '12px', color: 'var(--secondary)', textAlign: 'center' }}>
              Lost access to your authenticator app? 
              <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                Contact support
              </a>
            </p>
          </form>
        )}

        {/* Locked Account */}
        {type === 'locked' && (
          <div className={styles.challengeBox}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#f39c12' }}>lock</span>
              <h3 style={{ margin: '12px 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Account Locked</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--secondary)' }}>
                Too many failed attempts. Please wait before trying again.
              </p>
            </div>
            <div style={{ 
              padding: '16px', 
              background: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '8px',
              color: '#856404',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              <strong>Lockout time remaining: {searchParams.get('minutes') || 5} minute{parseInt(searchParams.get('minutes') || '5') !== 1 ? 's' : ''}</strong>
            </div>
            <button 
              onClick={() => window.location.href = redirectUrl}
              className={styles.verifyBtn}
              style={{ background: 'var(--secondary)' }}
            >
              Back to Login
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>
            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '6px' }}>arrow_back</span>
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}