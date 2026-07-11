"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './dashboard.module.css';
import Link from 'next/link';
import Image from 'next/image';
import Swal from 'sweetalert2';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('Alex');
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('spesAuth');
    if (!auth) {
      router.push('/');
    } else {
      try {
        const user = JSON.parse(auth);
        if (user.role !== 'user') {
          router.push('/');
        } else {
          setAuthed(true);
          setUserName((user.name || 'Alex').split(' ')[0]);
        }
      } catch {
        router.push('/');
      }
    }
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', showCancelButton: true, confirmButtonColor: '#d32f2f', cancelButtonColor: '#6b7280', confirmButtonText: 'Sign Out' });
    if (!result.isConfirmed) return;
    try { await fetch('https://spes-attendance-app.onrender.com/api/logout/', { method: 'POST', headers: { 'Authorization': `Token ${localStorage.getItem('spesToken')}`, 'Accept': 'application/json' } }); } catch {}
    localStorage.removeItem('spesAuth');
    localStorage.removeItem('spesToken');
    localStorage.removeItem('attendanceClock');
    router.push('/');
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!authed) return null;

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/history', label: 'Attendance History', icon: 'history' },
    { href: '/dashboard/reports', label: 'Reports', icon: 'assessment' },
  ];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoRow}>
            <Image src="/speslogo.png" alt="SPES Logo" width={36} height={36} className={styles.sidebarLogo} />
            <div>
              <h1>SpesAttendance</h1>
              <p>Management System</p>
            </div>
          </div>
        </div>
        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '0 1.5rem' }}>
          <a onClick={handleLogout} className={styles.navItem} style={{ cursor: 'pointer' }}>
            <span className="material-symbols-outlined">logout</span>
            Logout
          </a>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h2>Welcome back, {userName}</h2>
            <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className={styles.actions}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotif(!showNotif)} className={styles.iconBtn}>
                <span className="material-symbols-outlined">notifications</span>
                <span className={styles.notifBadge}></span>
              </button>
              {showNotif && (
                <div className={styles.notifDropdown}>
                  <div className={styles.notifHeader}>
                    <span>Notifications</span>
                    <span className={styles.notifCount}>3</span>
                  </div>
                  <div className={styles.notifItem}>
                    <div className={styles.notifDot} style={{ background: 'var(--success)' }}></div>
                    <div>
                      <p className={styles.notifText}><strong>Sarah Miller</strong> clocked in</p>
                      <p className={styles.notifTime}>Just now</p>
                    </div>
                  </div>
                  <div className={styles.notifItem}>
                    <div className={styles.notifDot} style={{ background: 'var(--primary)' }}></div>
                    <div>
                      <p className={styles.notifText}><strong>Robert Vance</strong> clocked out</p>
                      <p className={styles.notifTime}>2m ago</p>
                    </div>
                  </div>
                  <div className={styles.notifItem}>
                    <div className={styles.notifDot} style={{ background: 'var(--error)' }}></div>
                    <div>
                      <p className={styles.notifText}>Leave request from <strong>Anna Lee</strong></p>
                      <p className={styles.notifTime}>1h ago</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.initialsAvatar}>
              {getInitials(userName)}
            </div>
            <button onClick={handleLogout} className={styles.iconBtn} title="Sign out">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        <div className={styles.grid}>
          {children}
        </div>
      </main>
    </div>
  );
}
