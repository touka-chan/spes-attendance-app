"use client";
import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import styles from '../dashboard.module.css';
import { getUserAnalytics } from '../../lib/api';

const PIE_COLORS = ['#00b894', '#e17055'];
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
    getUserAnalytics().then(setData).catch(() => {});
    const interval = setInterval(() => getUserAnalytics().then(setData).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const totalDays = data?.total_days_worked || 0;
  const lateCount = data?.late_count || 0;
  const onTime = Math.max(0, totalDays - lateCount);

  const pieData = [
    { name: 'On Time', value: onTime, color: PIE_COLORS[0] },
    { name: 'Late', value: lateCount, color: PIE_COLORS[1] },
  ];

  const barData = (data?.daily_hours || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
    hours: d.hours,
  }));

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
            {entry.name}: <strong>{entry.value}h</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ gridColumn: 'span 12' }}>
      <div className={styles.card}>
        <h3>My Reports</h3>
        <p style={{ color: 'var(--secondary)', fontSize: 14, marginTop: 8 }}>Real-time attendance analytics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className={styles.card}>
          <h5 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>On Time vs Late</h5>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={({ active, payload, label }) => {
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
                        {entry.name}: <strong>{(entry.percent * 100).toFixed(0)}%</strong>
                      </p>
                    ))}
                  </div>
                );
              }} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 20 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h5 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>Daily Hours (7 days)</h5>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
              <YAxis type="category" dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} width={80} />
              <Tooltip content={({ active, payload, label }) => {
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
                        {entry.name}: <strong>{entry.value}h</strong>
                      </p>
                    ))}
                  </div>
                );
              }} />
              <Bar dataKey="hours" fill="#0984e3" radius={[0, 6, 6, 0]} name="Hours" maxBarWidth={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: 16 }}>
        <h5 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>Hours Trend</h5>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={barData} margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--secondary)' }} />
            <Tooltip content={({ active, payload, label }) => {
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
                      {entry.name}: <strong>{entry.value}h</strong>
                    </p>
                  ))}
                </div>
              );
            }} />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="#6c5ce7"
              strokeWidth={3}
              dot={{ fill: '#6c5ce7', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 12 }}>Auto-refreshes every 10 seconds.</p>
      </div>
    </div>
  );
}