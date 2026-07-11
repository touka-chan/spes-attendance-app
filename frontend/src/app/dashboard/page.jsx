"use client";
import { useState, useEffect } from 'react';
import styles from './dashboard.module.css';
import { clockIn, clockOut, getHistory, getSettings, getActiveSession } from '../lib/api';
import { showToast } from '../lib/alerts';

export default function Dashboard() {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [history, setHistory] = useState([]);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);

  useEffect(() => {
    Promise.all([
      getActiveSession().then(session => {
        if (session) {
          setClockedIn(true);
          setClockInTime(new Date(session.clock_in));
        }
      }).catch(() => {}),
      getSettings().then(setSettings).catch(() => {}),
      getHistory().then(setHistory).catch(() => {}),
    ]).finally(() => setLoading(false));

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) => {
    if (!d) return '--:-- --';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d) => {
    if (!d) return '--';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSessionDuration = () => {
    if (!clockInTime) return '00:00:00';
    const end = clockOutTime || now;
    const diff = Math.floor((end - clockInTime) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleClockIn = async () => {
    setClocking(true);
    try {
      const res = await clockIn();
      const time = new Date(res.attendance.clock_in);
      setClockedIn(true);
      setClockInTime(time);
      setClockOutTime(null);
      setError('');
      showToast('success', `Clocked in at ${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e) {
      if (e.message.includes('disabled')) setError('Contact your administrator to enable clock-in.');
      else if (e.message.includes('only allowed')) setError(e.message);
      else setError(e.message);
    }
    setClocking(false);
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      const res = await clockOut();
      const time = new Date(res.attendance.clock_out);
      setClockedIn(false);
      setClockOutTime(time);
      setError('');
      showToast('success', `Clocked out at ${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e) {
      if (e.message.includes('disabled')) setError('Contact your administrator to enable clock-out.');
      else if (e.message.includes('only allowed')) setError(e.message);
      else setError(e.message);
    }
    setClocking(false);
  };

  return (
    <>
      <div className={styles.col4}>
        <div className={`${styles.card} ${styles.clockCard}`}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.08, fontSize: 100, transform: 'rotate(-15deg)' }}>schedule</span>
          <div className={styles.timer}>{formatTime(clockInTime)}</div>
          <p style={{ fontSize: 12, color: 'var(--secondary)' }}>CLOCK IN TIME</p>
          <p style={{ fontSize: 11, color: 'var(--secondary)', margin: '4px 0 12px 0' }}>{formatDate(clockInTime)}</p>
          {error && <p style={{ fontSize: 11, color: 'var(--error)', margin: '0 0 8px 0' }}>{error}</p>}
          {!clockedIn && settings && !settings.clock_in_enabled && (
            <p style={{ fontSize: 11, color: 'var(--secondary)', margin: '0 0 8px 0', fontStyle: 'italic' }}>
              Clock-in is disabled. Allowed window: {settings.clock_in_start} - {settings.clock_in_end}.
            </p>
          )}
          {clockedIn && settings && !settings.clock_out_enabled && (
            <p style={{ fontSize: 11, color: 'var(--secondary)', margin: '0 0 8px 0', fontStyle: 'italic' }}>
              Clock-out is disabled. Allowed window: {settings.clock_out_start} - {settings.clock_out_end}.
            </p>
          )}
          {loading ? (
            <button className={styles.clockBtn} disabled style={{ opacity: 0.5 }}>
              <span className="material-symbols-outlined">hourglass_top</span>
              LOADING...
            </button>
          ) : clockedIn ? (
            <button className={`${styles.clockBtn} ${styles.clockBtnError}`} onClick={handleClockOut} disabled={clocking}>
              <span className="material-symbols-outlined">{clocking ? 'hourglass_top' : 'logout'}</span>
              {clocking ? 'PROCESSING...' : 'CLOCK OUT'}
            </button>
          ) : (
            <button className={styles.clockBtn} onClick={handleClockIn} disabled={clocking}>
              <span className="material-symbols-outlined">{clocking ? 'hourglass_top' : 'login'}</span>
              {clocking ? 'PROCESSING...' : 'CLOCK IN'}
            </button>
          )}
          {clockOutTime && (
            <p style={{ fontSize: 11, color: 'var(--secondary)', marginTop: 8 }}>
              Clock Out: {formatTime(clockOutTime)}
            </p>
          )}
        </div>
      </div>

      <div className={styles.col8}>
        <div className={styles.summaryRow}>
          <div className={styles.card}>
            <span style={{ fontSize: 12, color: 'var(--secondary)' }}>STATUS</span>
            <h3 style={{ color: clockedIn ? 'var(--success)' : 'var(--secondary)' }}>
              {clockedIn ? 'Clocked In' : clockOutTime ? 'Clocked Out' : 'Not Started'}
            </h3>
          </div>
          <div className={styles.card}>
            <span style={{ fontSize: 12, color: 'var(--secondary)' }}>SESSION DURATION</span>
            <h3>{getSessionDuration()}</h3>
          </div>
        </div>

        <div className={styles.card} style={{ padding: 0 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
            <h3>Recent Activity</h3>
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
                ) : history.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>No attendance records yet.</td></tr>
                ) : history.map(item => (
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
    </>
  );
}
