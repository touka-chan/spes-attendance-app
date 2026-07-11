"use client";
import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import styles from '../admin.module.css';
import { getAdminAnalytics } from '../../lib/api';

const PIE_COLORS = ['#00b894', '#e17055', '#b2bec3'];
const BAR_COLOR = '#0984e3';
const LINE_COLOR = '#6c5ce7';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--outline-variant)',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      fontSize: 13,
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--on-surface)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '4px 0 0', color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminAnalytics().then(setData).catch(() => {});
    const interval = setInterval(() => getAdminAnalytics().then(setData).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const total = data?.total_employees || 1;
  const present = data?.present_today || 0;
  const late = data?.late_today || 0;
  const absent = Math.max(0, total - present);

  const pieData = [
    { name: 'Present', value: present, color: PIE_COLORS[0] },
    { name: 'Late', value: late, color: PIE_COLORS[1] },
    { name: 'Absent', value: absent, color: PIE_COLORS[2] },
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
          <h5 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 600, color: 'var(--on-surface)' }}>Attendance Distribution</h5>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                dataKey="value"
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 20 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.scheduleCard}>
          <h5 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 600, color: 'var(--on-surface)' }}>Daily Attendance (7 days)</h5>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
              <YAxis type="category" dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 6, 6, 0]} name="Present" maxBarWidth={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.scheduleCard}>
        <h5 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 600, color: 'var(--on-surface)' }}>Attendance Trend</h5>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData} margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={LINE_COLOR}
              strokeWidth={3}
              dot={{ fill: LINE_COLOR, strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 12 }}>Auto-refreshes every 10 seconds.</p>
      </div>
    </>
  );
}