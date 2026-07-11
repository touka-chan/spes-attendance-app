"use client";
import { useState, useEffect } from 'react';
import styles from '../dashboard.module.css';
import { getHistory } from '../../lib/api';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then(setRecords).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ gridColumn: 'span 12' }}>
      <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <h3>Attendance History</h3>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
                <th>Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>Loading history...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>No records found.</td></tr>
              ) : records.map(item => (
                <tr key={item.id}>
                  <td>{new Date(item.clock_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>{new Date(item.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{item.clock_out ? new Date(item.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                  <td><span className={`${styles.badge} ${item.clock_out ? styles.badgePresent : styles.badgeLate}`}>{item.clock_out ? 'Completed' : 'Clocked In'}</span></td>
                  <td>{item.duration || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
