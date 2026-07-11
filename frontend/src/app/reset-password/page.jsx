"use client";
import { Suspense } from 'react';
import ResetPasswordContent from './ResetPasswordContent';
import styles from './reset-password.module.css';

export default function ResetPasswordPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Reset Password</h1>
            <p>Loading...</p>
          </div>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}