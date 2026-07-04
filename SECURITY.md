# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Universal Notebook, please report it
privately rather than opening a public issue:

- Use **GitHub Security Advisories** (repository → *Security* → *Report a
  vulnerability*), or
- email the maintainer.

Please include reproduction steps and the affected version. We aim to
acknowledge reports within 5 business days.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## Security Model

Universal Notebook is a local-first notes app that optionally syncs to a
Supabase backend.

### Backend configuration
- Supabase URL and anon key are injected at **build time** via
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). No
  backend credentials are committed to the repository.
- When those variables are absent, the app runs fully offline in **demo mode**
  and never contacts a backend. It will not silently use a shared project.
- The Supabase anon key is a *publishable* key and is safe to ship in a client
  bundle; data isolation is enforced server-side by Row Level Security, not by
  key secrecy.

### Data isolation (Row Level Security)
All user tables (`notebooks`, `notes`, `tags`, `note_tags`, `note_versions`,
`custom_templates`) have RLS **enabled** with owner-scoped policies
(`auth.uid() = user_id`, and ownership-through-join for `note_tags` /
`note_versions`). See `supabase/migrations/001_initial_schema.sql`. A user can
only read or write their own rows.

### Client storage
- Notes are cached locally in IndexedDB for offline use.
- Auth tokens are managed by `@supabase/supabase-js` (auto-refresh).
- On Android, `android:allowBackup` is disabled so app data (including tokens)
  is not captured by device/cloud backups.
- Desktop (Tauri) ships a restrictive Content-Security-Policy limiting network
  access to the configured Supabase origin.

### Dependency & code scanning
- **Dependabot** keeps npm, GitHub Actions, Cargo, and Gradle dependencies
  patched (`.github/dependabot.yml`).
- **CodeQL** runs security-and-quality analysis on every push/PR to `main`
  (`.github/workflows/codeql.yml`).
- CI runs `npm audit` on every push/PR (`.github/workflows/ci.yml`).

## Hardening checklist for production deployments
- [ ] Provide your own `VITE_SUPABASE_*` values (never reuse someone else's project).
- [ ] Run `supabase/migrations/001_initial_schema.sql` and confirm RLS is enabled on every table.
- [ ] Restrict the Supabase project's allowed redirect URLs to your app's origins.
- [ ] Configure code signing for released binaries (see `docs/SIGNING.md`).
- [ ] Enable GitHub secret scanning + push protection on the repository.
