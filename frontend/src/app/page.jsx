"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import Image from 'next/image';
import { authenticateUser } from './lib/users';
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
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const user = await authenticateUser(email, password);

      if (!user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      localStorage.removeItem('attendanceClock');
      localStorage.setItem('spesToken', user.token);
      localStorage.setItem('spesAuth', JSON.stringify({
        role: user.role,
        name: user.name,
        email: user.email,
        loginTime: new Date().toISOString(),
      }));

      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Connection error. Make sure the server is running.');
      setLoading(false);
    }
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

          <form className={styles.form} onSubmit={handleLogin}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">mail</span>
                <input type="email" name="email" placeholder="Email Address" required />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">lock</span>
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  placeholder="••••••••••••"
                  required
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
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>

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
              <button onClick={async () => {
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
              }} disabled={forgotSending}
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
