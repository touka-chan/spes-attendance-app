"use client";
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import styles from '../dashboard.module.css';
import { getUserAnalytics } from '../../lib/api';

const COLORS = ['var(--success)', 'var(--error)'];

export default function ReportsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getUserAnalytics().then(setData).catch(() => {});
    const interval = setInterval(() => getUserAnalytics().then(setData).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const pieData = [
    { name: 'On Time', value: Math.max(0, (data?.total_days_worked || 0) - (data?.late_count || 0)) },
    { name: 'Late', value: data?.late_count || 0 },
  ];

  const barData = (data?.daily_hours || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
    hours: d.hours,
  }));

  return (
    <div style={{ gridColumn: 'span 12' }}>
      <div className={styles.card}>
        <h3>My Reports</h3>
        <p style={{ color: 'var(--secondary)', fontSize: 14, marginTop: 8 }}>Real-time attendance analytics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className={styles.card}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: 14 }}>On Time vs Late</h5>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Daily Hours (7 days)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--secondary)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--secondary)' }} />
              <Tooltip />
              <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: 16 }}>
        <h5 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Hours Trend</h5>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--secondary)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--secondary)' }} />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)' }} name="Hours" />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 8 }}>Auto-refreshes every 10 seconds.</p>
      </div>
    </div>
  );
}
