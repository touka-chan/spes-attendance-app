"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './admin.module.css';
import Link from 'next/link';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { getNotifications, markRead, markAllRead, timeAgo } from '../lib/notifications';

const THEMED_SWAL = {
  background: 'var(--surface)',
  color: 'var(--on-surface)',
  confirmButtonColor: 'var(--primary)',
  cancelButtonColor: 'var(--secondary)',
  customClass: {
    popup: 'themed-swal-popup',
    title: 'themed-swal-title',
    htmlContainer: 'themed-swal-content',
    confirmButton: 'themed-swal-confirm',
    cancelButton: 'themed-swal-cancel',
  },
};

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('Admin User');
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevUnreadRef = { current: 0 };

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem('spesAuth');
      if (!auth) {
        window.location.href = '/';
        return;
      }
      try {
        const user = JSON.parse(auth);
        if (user.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        if (user.expiresAt) {
          const expiresAt = new Date(user.expiresAt).getTime();
          const now = Date.now();
          if (now >= expiresAt) {
            setSessionExpired(true);
            return;
          }
        }
        setAuthed(true);
        setUserName(user.name || 'Admin User');
      } catch {
        window.location.href = '/';
      }
    };

    const fetchNotifs = () => {
      getNotifications().then(data => {
        if (data) {
          setNotifications(data);
          const count = data.filter(n => !n.is_read).length;
          setUnreadCount(count);
          if (count > prevUnreadRef.current && document.hidden) {
            try {
              const notif = new Notification('SpesAttendance', {
                body: data.find(n => !n.is_read)?.title || 'New notification',
                icon: '/speslogo.png',
              });
              setTimeout(() => notif.close(), 5000);
            } catch {}
          }
          prevUnreadRef.current = count;
        }
      }).catch(() => {});
    };

    checkAuth();
    fetchNotifs();
    const authInterval = setInterval(checkAuth, 30000);
    const notifInterval = setInterval(fetchNotifs, 30000);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { clearInterval(authInterval); clearInterval(notifInterval); };
  }, []);

  const showSessionExpired = () => {
    Swal.fire({
      ...THEMED_SWAL,
      icon: 'warning',
      title: 'Session Expired',
      text: 'Your session has expired. Please log in again.',
      confirmButtonText: 'Log In Again',
    }).then(() => {
      localStorage.removeItem('spesAuth');
      localStorage.removeItem('spesToken');
      localStorage.removeItem('attendanceClock');
      window.location.href = '/';
    });
  };

  if (sessionExpired) {
    if (!window.__sessionAlertShown) {
      window.__sessionAlertShown = true;
      showSessionExpired();
    }
    return null;
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      ...THEMED_SWAL,
      icon: 'question',
      title: 'Sign Out?',
      showCancelButton: true,
      confirmButtonText: 'Sign Out',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try { await fetch('https://spes-attendance-app.onrender.com/api/logout/', { method: 'POST', headers: { 'Authorization': `Token ${localStorage.getItem('spesToken')}`, 'Accept': 'application/json' } }); } catch {}
    localStorage.removeItem('spesAuth');
    localStorage.removeItem('spesToken');
    localStorage.removeItem('attendanceClock');
    window.location.href = '/';
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      await markRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!authed) return null;

  const notifColors = { clock_in: 'var(--success)', clock_out: 'var(--primary)', settings: 'var(--error)', info: 'var(--primary)', warning: '#f39c12' };

  const navItems = [
    { href: '/admin', label: 'Admin Dashboard', icon: 'dashboard' },
    { href: '/admin/employees', label: 'Employee Management', icon: 'group' },
    { href: '/admin/attendance', label: 'Attendance Overview', icon: 'calendar_month' },
    { href: '/admin/reports', label: 'Reports', icon: 'assessment' },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.layout}>
      <div
        className={styles.sidebarOverlay}
        onClick={closeSidebar}
        style={sidebarOpen ? { display: 'block' } : {}}
      />
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
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
              className={`${styles.navItem} ${pathname === item.href || pathname.startsWith(item.href + '/') ? styles.navItemActive : ''}`}
              onClick={closeSidebar}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setSidebarOpen(true)} className={`${styles.iconBtn} ${styles.hamburger}`}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2>SpesAttendance</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotif(!showNotif)} className={styles.iconBtn}>
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotif && (
                <div className={styles.notifDropdown}>
                  <div className={styles.notifHeader}>
                    <span>Notifications</span>
                    {unreadCount > 0 && <a onClick={handleMarkAllRead} style={{ fontSize: 12, cursor: 'pointer', color: 'var(--primary)' }}>Mark all read</a>}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)', fontSize: 13 }}>No notifications yet.</div>
                  ) : notifications.slice(0, 20).map(n => (
                    <div key={n.id} className={styles.notifItem} onClick={() => handleNotifClick(n)} style={{ cursor: 'pointer', opacity: n.is_read ? 0.6 : 1, background: n.is_read ? 'transparent' : 'rgba(0,82,204,0.04)' }}>
                      <div className={styles.notifDot} style={{ background: notifColors[n.type] || 'var(--primary)' }}></div>
                      <div>
                        <p className={styles.notifText}>{n.title}</p>
                        <p className={styles.notifTime}>{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--outline-variant)', paddingLeft: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{userName}</p>
                <p style={{ margin: 0, fontSize: '10px', color: 'var(--secondary)' }}>SYSTEM ADMIN</p>
              </div>
              <div className={styles.initialsAvatar}>
                {getInitials(userName)}
              </div>
              <button onClick={handleLogout} className={styles.iconBtn} title="Sign out">
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
