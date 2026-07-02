# Dropline Admin (parity with AuthorsDrop)

Admin panel at `/admin` — requires `is_admin` on your account.

## Tabs

| Tab | Features |
|-----|----------|
| **Users** | Active (15m) / All users, expand row for login history, enable/disable, make admin, reset password, unlock sign-in, clear books, delete user |
| **Login Attempts** | Search by email/IP, unlock failed attempts, block/unblock IP |
| **Security** | Alerts (unknown login bursts), blocked IP list, unknown login attempts |

## Not included (AuthorsDrop-only for now)

- Invite codes / friend codes (no billing on Dropline yet)
- Billing actions (mark paid, trial, exempt)
- Resend domain status
- Security threshold settings UI (uses env vars)

## Env vars (optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `FAILED_LOGIN_THRESHOLD` | 5 | Failed logins before lockout |
| `FAILED_LOGIN_WINDOW_MINUTES` | 10 | Lockout window |
| `UNKNOWN_LOGIN_ALERT_THRESHOLD` | 10 | Failed logins before security alert |
| `ACTIVE_USER_WINDOW_MINUTES` | 15 | "Active users" tab window |

## First admin

Set on Render → `dropline` service:

- `ADMIN_INITIAL_EMAIL`
- `ADMIN_INITIAL_PASSWORD`

Redeploy — admin account created on boot.

## Schema

New tables (via `drizzle-kit push` on deploy): `login_events`, `blocked_ips`, `admin_alerts`.  
Users gain `last_active_at` column (auto-added on API startup).
