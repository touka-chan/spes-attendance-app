"use client";
import { useState, useEffect } from 'react';

export function CaptchaChallenge({ email, siteKey, onSuccess, onError }) {
  const [widgetId, setWidgetId] = useState(null);
  const [error, setError] = useState('');

  // Load Turnstile script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Render Turnstile widget
  useEffect(() => {
    if (!window.turnstile || !siteKey) return;
    
    const id = window.turnstile.render('#captcha-widget', {
      sitekey: siteKey,
      theme: 'light',
      callback: (token) => {
        onSuccess(token);
      },
      'expired-callback': () => {
        setError('CAPTCHA expired. Please try again.');
      },
      'error-callback': () => {
        setError('CAPTCHA error. Please try again.');
      },
    });
    setWidgetId(id);
  }, [siteKey, onSuccess]);

  // Reset widget when re-shown
  useEffect(() => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }, [widgetId]);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        padding: '16px', 
        background: 'var(--background)', 
        borderRadius: '12px',
        border: '1px solid var(--outline-variant)',
        textAlign: 'center'
      }}>
        <p style={{ 
          margin: '0 0 16px 0', 
          fontSize: '14px', 
          color: 'var(--secondary)',
          fontWeight: 500
        }}>
          Please complete the CAPTCHA to verify you're human
        </p>
        <div id="captcha-widget"></div>
        {error && (
          <p style={{ 
            margin: '12px 0 0 0', 
            fontSize: '13px', 
            color: 'var(--error)' 
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function TwoFAChallenge({ email, onSuccess, onError }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://spes-attendance-app.onrender.com/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, totp_code: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid 2FA code');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        padding: '16px', 
        background: 'var(--background)', 
        borderRadius: '12px',
        border: '1px solid var(--outline-variant)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>security</span>
          <h4 style={{ margin: '8px 0 4px 0', fontSize: '16px', fontWeight: 600 }}>Two-Factor Authentication</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--secondary)' }}>
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoComplete="one-time-code"
            inputMode="numeric"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '24px',
              letterSpacing: '8px',
              textAlign: 'center',
              border: '1px solid var(--outline-variant)',
              borderRadius: '10px',
              background: 'var(--surface)',
              color: 'var(--on-surface)',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
            autoFocus
            disabled={loading}
          />
          
          {error && (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--error)', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: 'var(--secondary)', textAlign: 'center' }}>
          Don't have access to your authenticator app? 
          <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}