"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './reset-password.module.css';
import { resetPassword } from '../lib/api';

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!token) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (e) {
      setError(e.message || 'Reset failed. Try requesting a new link.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Reset Password</h1>
          <p>Enter your new password below</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>Password reset successful! Redirecting to login...</div>}

        {!success && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label>New Password</label>
              <div className={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Confirm Password</label>
              <div className={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'RESETTING...' : 'RESET PASSWORD'}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <a href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}