"use client";
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';
import { request } from '../../lib/api';

export default function AttendancePage() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    request('/admin/attendance/').then(setRecords).catch(() => {});
  }, []);

  return (
    <>
      <div className={styles.overviewHeader}>
        <div>
          <h3>Attendance Overview</h3>
          <p>Monitor daily attendance records</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnSecondary}>
            <span className="material-symbols-outlined">file_download</span>
            Export
          </button>
        </div>
      </div>
      <div className={styles.scheduleCard} style={{ padding: 0, overflow: 'hidden' }}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID No.</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
                <th>Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.user_name}</td>
                  <td>{item.user_id_no}</td>
                  <td>{new Date(item.clock_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>{new Date(item.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{item.clock_out ? new Date(item.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                  <td><span className={`${styles.badge} ${item.clock_out ? styles.badgePresent : styles.badgeLate}`}>{item.clock_out ? 'Completed' : 'Clocked In'}</span></td>
                  <td>{item.duration || '--'}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>No attendance records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
