# SWH Basketball Club — Player Agreement

Public page for the club–player agreement and membership acknowledgement form.

## Local development

```bash
npm install
env -u DATABASE_URL APP_BASE_URL=http://127.0.0.1:3000 npm run dev
```

Without `DATABASE_URL`, acknowledgements use in-memory PGlite (sample / local). With Postgres available after publish, the same code path uses `DATABASE_URL`.

Agreement copy lives in `src/lib/agreement.ts` — bump `AGREEMENT_VERSION` when rules change.

Optional admin list: `/admin` (open locally without a token when Postgres is off; set `ADMIN_TOKEN` and sign in with the form — token is never put in the URL).

Player profile: `/profile` via email magic link (no Cursor account). First acknowledgement with a **new** email creates a profile and signs that browser in. Existing emails cannot be taken over from the public form; profile edits require a session. Optional `RESEND_API_KEY` + `EMAIL_FROM` + `APP_BASE_URL` enable emailed sign-in links. Keep the published app **Public** so players can open it.
