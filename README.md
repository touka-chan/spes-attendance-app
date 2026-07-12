# Spes Attendance System

A web-based attendance tracking system with CAPTCHA verification, role-based access, and real-time notifications.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.9 (static export) |
| Backend | Django 6.0.7 + DRF 3.17.1 |
| Database | PostgreSQL (production) / SQLite (dev) |
| Hosting | Firebase Hosting (frontend), Render (backend) |
| Auth | DRF TokenAuthentication |
| CAPTCHA | Cloudflare Turnstile |
| Email | SendGrid HTTP API |
| Notifications | In-app bell + Browser Notification API |
| Charts | Recharts |

## Architecture

```
Browser ──HTTPS──> Firebase Hosting (static files)
                     │
                     │ fetch API
                     ▼
              Render (Django backend)
                     │
                     ▼
              PostgreSQL
```

- Frontend is a fully static Next.js export (no SSR)
- All API calls go directly from browser to Django backend
- No WebSockets — 30s polling for real-time sync (Render free tier limitation)
- Backend auto-deploys from GitHub master branch

## System Features

### Authentication & Security
- **Cloudflare Turnstile CAPTCHA** on every visit — redirects to `/challenge` on first load, stores `captcha_verified` in sessionStorage
- **Login**: Email/password authentication with role-based tokens
- **Session expiry**: 30 minutes for users, 3 hours for admins — auto-logout with themed Swal alert
- **Password reset**: Token-based (1-hour expiry, single-use), email sent via SendGrid

### User Features
- **Clock In / Clock Out**: Configurable time windows with independent enabled toggles; grace period (configurable) before marking late
- **Dashboard**: Active session card with real-time duration display; contextual button states (Ready to Clock In / Clocked In / Clocked Out)
- **History**: All past attendance records with status badges (Late, Completed/Late, Completed, Clocked In, Not Started)
- **Reports**: Personal analytics with charts (attendance trends, on-time vs late breakdown)

### Admin Features
- **Dashboard**: Analytics — total users, present today, late today, absent today; key metrics cards
- **Attendance**: View all user attendance records; CSV export; filterable by date
- **Employees**: Create, edit, delete users; auto-generates EMP-XXX IDs; email notification on creation
- **Settings**: Configure clock-in/out time windows; enable/disable each window; set grace period (minutes before marking late)
- **Reports**: Comprehensive analytics with chart exports (CSV)

### Notifications
- **Types**: clock_in, clock_out, settings change
- **Triggers**: Clock-in/out notifies all admins; settings changes notify all users
- **Delivery**: Bell icon with unread count badge; dropdown list with color-coded dots; mark-read / mark-all-read
- **Browser API**: Background tab notifications when new alerts arrive
- **Polling**: Every 30 seconds

### UI/UX
- **SweetAlert2**: All alerts/toasts replaced with themed Swal — compact sizes (380px popups, 320px toasts)
- **Skeleton loading**: Shimmer animation on all data tables and cards
- **Font**: Inter (single font across entire system)
- **Charts**: Vertical bar charts with rounded bars; line charts with dots; custom tooltips
- **Status badges**: Color-coded (yellow for Late, green for Completed, blue for Clocked In)
- **Real-time sync**: Auto-refetch after clock-in/out/CRUD; 30s polling on all data pages

## API Endpoints

### Authentication
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/login/` | AllowAny | Email + password authentication |
| POST | `/api/login/verify-challenge/` | AllowAny | Verify CAPTCHA token |
| POST | `/api/logout/` | AllowAny | Logout (delete token) |
| GET | `/api/get-site-key/` | AllowAny | Get Turnstile site key |

### User
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/user/` | Token | Get current user info |
| GET | `/api/user/analytics/` | Token | User analytics data |

### Attendance
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/attendance/clock-in/` | Token | Clock in (respects grace period) |
| POST | `/api/attendance/clock-out/` | Token | Clock out (if active session) |
| GET | `/api/attendance/active/` | Token | Current active session |
| GET | `/api/attendance/history/` | Token | User attendance history |

### Admin
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/attendance/` | Admin | All attendance records |
| GET | `/api/admin/analytics/` | Admin | Dashboard analytics |
| GET/POST | `/api/admin/settings/` | Admin | Attendance settings (time windows, grace period) |
| GET/POST | `/api/admin/employees/` | Admin | List / create employees |
| PUT/DELETE | `/api/admin/employees/<id>/` | Admin | Update / delete employee |

### Notifications
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications/` | Token | Get user notifications |
| POST | `/api/notifications/<id>/read/` | Token | Mark single as read |
| POST | `/api/notifications/read-all/` | Token | Mark all as read |

### Password Reset
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/forgot-password/` | AllowAny | Send reset link via email |
| POST | `/api/reset-password/` | AllowAny | Reset password with token |

## Frontend Routes

| Route | Page |
|---|---|
| `/` | Login page |
| `/challenge` | CAPTCHA challenge (Turnstile) |
| `/reset-password` | Password reset form |
| `/dashboard` | User dashboard — clock in/out |
| `/dashboard/history` | Attendance history |
| `/dashboard/reports` | User analytics |
| `/admin` | Admin dashboard — analytics & settings |
| `/admin/attendance` | All attendance records |
| `/admin/employees` | Manage employees |
| `/admin/reports` | Admin reports & charts |

## Models

### User
`id_no`, `firstname`, `middlename`, `lastname`, `suffix`, `email` (username field), `role` (user/admin)

### Attendance
`user` (FK), `clock_in`, `clock_out` (nullable), `is_late`, `created_at`

### AttendanceSettings
`clock_in_start`, `clock_in_end`, `clock_out_start`, `clock_out_end`, `clock_in_enabled`, `clock_out_enabled`, `grace_minutes` (default 10)

### PasswordResetToken
`user` (FK), `token` (unique), `created_at`, `expires_at`, `used`

### Notification
`recipient_role` (user/admin/all), `recipient` (FK, nullable), `notif_type` (clock_in/clock_out/settings/info/warning), `title`, `message`, `related_user` (FK), `is_read`, `created_at`

## Deployment

### Backend (Render)
- Entrypoint: `start.sh` — runs `migrate` → `seed` → password reset → `gunicorn`
- Required env vars: `DATABASE_URL`, `DJANGO_SECRET_KEY`, `SENDGRID_API_KEY`, `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY`
- Optional: `SENDGRID_FROM_EMAIL`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build    # generates static out/
firebase deploy  # uploads to Firebase CDN
```
- Firebase rewrites handle SPA routing (admin/* → admin.html, dashboard/* → dashboard.html, etc.)
- No-cache headers on JS/CSS/HTML (Ctrl+Shift+R after deploy)

## Test Credentials

| Email | Password | Role |
|---|---|---|
| admin@spes.com | admin123 | Admin |
| user@spes.com | user123 | User |

## Key Design Decisions

- **No WebSockets**: Render free tier doesn't support them; 30s polling instead
- **Static export**: Next.js `output: 'export'` — no SSR, all API calls direct to Django
- **No incremental lockout/2FA**: Removed from login flow — only Turnstile on every visit
- **Grace period**: Configurable per-setting, not per-user; marks `is_late` if clock-in exceeds allowed window + grace minutes
- **SendGrid API**: Direct HTTP API (port 443), not SMTP — works on Render free tier
- **Singleton Swal toast**: Prevents overlapping alert popups
- **SessionStorage for CAPTCHA**: `captcha_verified` flag persists across page navigations but clears on tab close
