"use client";
import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import { getSettings, updateSettings } from '../lib/api';

export default function AdminPanel() {
  const [settings, setSettings] = useState(null);
  const [clockInStart, setClockInStart] = useState('07:00');
  const [clockInEnd, setClockInEnd] = useState('07:20');
  const [clockOutStart, setClockOutStart] = useState('17:00');
  const [clockOutEnd, setClockOutEnd] = useState('17:20');
  const [clockInEnabled, setClockInEnabled] = useState(false);
  const [clockOutEnabled, setClockOutEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSettings().then(res => {
      setSettings(res);
      setClockInStart(res.clock_in_start);
      setClockInEnd(res.clock_in_end);
      setClockOutStart(res.clock_out_start);
      setClockOutEnd(res.clock_out_end);
      setClockInEnabled(res.clock_in_enabled);
      setClockOutEnabled(res.clock_out_enabled);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await updateSettings({ clock_in_start: clockInStart, clock_in_end: clockInEnd, clock_out_start: clockOutStart, clock_out_end: clockOutEnd, clock_in_enabled: clockInEnabled, clock_out_enabled: clockOutEnabled });
      setMsg('Settings saved');
    } catch (e) {
      setMsg('Error: ' + e.message);
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <>
      <div className={styles.overviewHeader}>
        <div>
          <h3>Admin Overview</h3>
          <p>System status</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary}>
            <span className="material-symbols-outlined">file_download</span>
            Generate Report
          </button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIcon} style={{ background: 'rgba(0, 82, 204, 0.1)', color: 'var(--primary)' }}>
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--secondary)', textTransform: 'uppercase' }}>Total Employees</p>
          <h4 style={{ fontSize: 32, margin: 0 }}>--</h4>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIcon} style={{ background: 'rgba(113, 219, 166, 0.2)', color: 'var(--tertiary)' }}>
              <span className="material-symbols-outlined">how_to_reg</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--secondary)', textTransform: 'uppercase' }}>Present Today</p>
          <h4 style={{ fontSize: 32, margin: 0 }}>--</h4>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIcon} style={{ background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)' }}>
              <span className="material-symbols-outlined">alarm</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--secondary)', textTransform: 'uppercase' }}>Late Arrivals</p>
          <h4 style={{ fontSize: 32, margin: 0 }}>--</h4>
        </div>
      </div>

      <div className={styles.scheduleCard}>
        <div className={styles.scheduleHeader}>
          <h5>Attendance Schedule</h5>
        </div>
        <p style={{ fontSize: 13, color: 'var(--secondary)', margin: '0 0 20px 0' }}>
          Control clock-in and clock-out independently. Set time windows and enable/disable each.
        </p>
        <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 6 }}>CLOCK IN WINDOW</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="time" value={clockInStart} onChange={e => setClockInStart(e.target.value)} className={styles.timeInput} style={{ width: 100 }} />
              <span style={{ fontSize: 13, color: 'var(--secondary)' }}>to</span>
              <input type="time" value={clockInEnd} onChange={e => setClockInEnd(e.target.value)} className={styles.timeInput} style={{ width: 100 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className={styles.toggle}>
                <input type="checkbox" checked={clockInEnabled} onChange={() => setClockInEnabled(prev => !prev)} />
                <span className={styles.toggleSlider}></span>
              </label>
              <span style={{ fontSize: 12, fontWeight: 600, color: clockInEnabled ? 'var(--success)' : 'var(--secondary)' }}>
                {clockInEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 6 }}>CLOCK OUT WINDOW</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="time" value={clockOutStart} onChange={e => setClockOutStart(e.target.value)} className={styles.timeInput} style={{ width: 100 }} />
              <span style={{ fontSize: 13, color: 'var(--secondary)' }}>to</span>
              <input type="time" value={clockOutEnd} onChange={e => setClockOutEnd(e.target.value)} className={styles.timeInput} style={{ width: 100 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className={styles.toggle}>
                <input type="checkbox" checked={clockOutEnabled} onChange={() => setClockOutEnabled(prev => !prev)} />
                <span className={styles.toggleSlider}></span>
              </label>
              <span style={{ fontSize: 12, fontWeight: 600, color: clockOutEnabled ? 'var(--success)' : 'var(--secondary)' }}>
                {clockOutEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className={styles.btnPrimary} style={{ height: 44, alignSelf: 'flex-end' }}>
            <span className="material-symbols-outlined">save</span>
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
        {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 0 }}>{msg}</p>}
      </div>
    </>
  );
}
