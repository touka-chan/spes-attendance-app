"use client";
import { Suspense } from 'react';
import ChallengePageContent from './ChallengePageContent';
import styles from './challenge.module.css';

export default function ChallengePage() {
  return (
    <div className={styles.container}>
      <Suspense
        fallback={
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.header}>
                <h1>SpesAttendance</h1>
                <p>Loading...</p>
              </div>
            </div>
          </div>
        }
      >
        <ChallengePageContent />
      </Suspense>
    </div>
  );
}