"use client";
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import styles from '../admin.module.css';
import { getAdminAnalytics } from '../../lib/api';

const COLORS = ['var(--success)', 'var(--error)', 'var(--outline-variant)'];

export default function ReportsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminAnalytics().then(setData).catch(() => {});
    const interval = setInterval(() => getAdminAnalytics().then(setData).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const total = data?.total_employees || 1;
  const pieData = [
    { name: 'Present', value: data?.present_today || 0 },
    { name: 'Late', value: data?.late_today || 0 },
    { name: 'Absent', value: Math.max(0, total - (data?.present_today || 0)) },
  ];

  const barData = (data?.daily_attendance || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
    count: d.count,
  }));

  const lineData = (data?.daily_attendance || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
    count: d.count,
  }));

  return (
    <>
      <div className={styles.overviewHeader}>
        <div>
          <h3>Reports</h3>
          <p>Real-time attendance analytics</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className={styles.scheduleCard}>
          <h5 style={{ margin: '0 0 16px 0' }}>Attendance Distribution</h5>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.scheduleCard}>
          <h5 style={{ margin: '0 0 16px 0' }}>Daily Attendance (7 days)</h5>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Present" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.scheduleCard}>
        <h5 style={{ margin: '0 0 16px 0' }}>Attendance Trend</h5>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)' }} name="Present" />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 8 }}>Auto-refreshes every 10 seconds.</p>
      </div>
    </>
  );
}
