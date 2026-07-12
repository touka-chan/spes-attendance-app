"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './challenge.module.css';
import Image from 'next/image';

const FALLBACK_SITE_KEY = '0x4AAAAAADz4Rw2SNZMVKi8i';

export default function ChallengePageContent() {
  const searchParams = useSearchParams();

  const [siteKey, setSiteKey] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [widgetId, setWidgetId] = useState(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [widgetTimeout, setWidgetTimeout] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setSiteKey(searchParams.get('site_key') || FALLBACK_SITE_KEY);
    setRedirectUrl(searchParams.get('redirect') || '/');
  }, [searchParams]);

  useEffect(() => {
    if (window.turnstile) {
      setTurnstileReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    window.onTurnstileLoad = () => setTurnstileReady(true);
    document.head.appendChild(script);
    return () => { delete window.onTurnstileLoad; };
  }, []);

  useEffect(() => {
    if (widgetId || turnstileReady) return;
    const timer = setTimeout(() => setWidgetTimeout(true), 10000);
    return () => clearTimeout(timer);
  }, [widgetId, turnstileReady]);

  const renderWidget = () => {
    if (!window.turnstile || !siteKey || widgetId) return;
    const id = window.turnstile.render('#captcha-widget', {
      sitekey: siteKey,
      theme: 'light',
      callback: (token) => handleCaptchaSuccess(token),
      'expired-callback': () => setError('Challenge expired. Please refresh the page.'),
      'error-callback': () => setError('Verification failed. Please refresh and try again.'),
    });
    setWidgetId(id);
    setWidgetTimeout(false);
  };

  useEffect(() => {
    if (turnstileReady && siteKey && !widgetId) {
      renderWidget();
    }
  }, [turnstileReady, siteKey, widgetId]);

  const handleCaptchaSuccess = async (token) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://spes-attendance-app.onrender.com/api/login/verify-challenge/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captcha_token: token, redirect_url: redirectUrl }),
      });

      let data;
      try { data = await res.json(); }
      catch { throw new Error('Server error. Please refresh and try again.'); }

      if (res.ok && (data.fresh_verified || data.message === 'CAPTCHA verified successfully')) {
        sessionStorage.setItem('captcha_verified', 'true');
        setVerified(true);
        setTimeout(() => { window.location.href = redirectUrl; }, 3000);
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', zIndex: 10 }}>
            <div className={styles.spinner}></div>
            <p style={{ marginTop: '16px', color: 'var(--secondary)' }}>Verifying...</p>
          </div>
        )}

        <div className={styles.header}>
          <Image src="/speslogo.png" alt="SPES Logo" width={64} height={64} className={styles.logo} />
          <h1>SpesAttendance</h1>
          <p>Security Verification</p>
        </div>

        {error && <div className={styles.error}>
          <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>error</span>
          {error}
        </div>}

        {verified ? (
          <div className={styles.challengeBox}>
            <div className={styles.checkmarkContainer}>
              <div className={styles.checkmarkCircle}>
                <svg viewBox="0 0 24 24">
                  <polyline points="4,12 10,18 20,6" />
                </svg>
              </div>
              <div className={styles.successText}>Verified!</div>
              <div className={styles.redirectText}>Redirecting to login...</div>
            </div>
          </div>
        ) : (
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
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--secondary)' }}>
            {widgetId ? 'Complete the CAPTCHA above to continue' : ' '}
          </div>
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
