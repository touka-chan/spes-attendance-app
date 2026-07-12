"use client";
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';
import { request } from '../../lib/api';

function downloadCSV(records) {
  const headers = ['Employee', 'ID No.', 'Date', 'Clock In', 'Clock Out', 'Status', 'Total Hours'];
  const rows = records.map(item => [
    item.user_name,
    item.user_id_no,
    new Date(item.clock_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    new Date(item.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    item.clock_out ? new Date(item.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--',
    item.clock_out ? 'Completed' : 'Clocked In',
    item.duration || '--',
  ].map(v => `"${v}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SkeletonRow() {
  return (
    <tr>
      <td><div className="skeleton skeleton-text" style={{ width: 120 }}></div></td>
      <td><div className="skeleton skeleton-text" style={{ width: 80 }}></div></td>
      <td><div className="skeleton skeleton-text" style={{ width: 100 }}></div></td>
      <td><div className="skeleton skeleton-text" style={{ width: 60 }}></div></td>
      <td><div className="skeleton skeleton-text" style={{ width: 60 }}></div></td>
      <td><div className="skeleton skeleton-badge"></div></td>
      <td><div className="skeleton skeleton-text" style={{ width: 50 }}></div></td>
    </tr>
  );
}

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = () => {
    request('/admin/attendance/').then(setRecords).catch(() => {});
  };

  useEffect(() => {
    request('/admin/attendance/').then(setRecords).catch(() => {}).finally(() => setLoading(false));
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className={styles.overviewHeader}>
        <div>
          <h3>Attendance Overview</h3>
          <p>Monitor daily attendance records</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={() => downloadCSV(records)} disabled={records.length === 0}>
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : records.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>No attendance records found.</td></tr>
              ) : records.map(item => (
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
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
