# SWH Basketball Club — Player Agreement

Public page for the club–player agreement and membership acknowledgement form.

## Local development

```bash
npm install
env -u DATABASE_URL npm run dev
```

Without `DATABASE_URL`, acknowledgements use in-memory PGlite (sample / local). With Postgres available after publish, the same code path uses `DATABASE_URL`.

Agreement copy lives in `src/lib/agreement.ts` — bump `AGREEMENT_VERSION` when rules change.

Optional admin list: `/admin` (open locally without a token; set `ADMIN_TOKEN` and use `/admin?token=…` when Postgres is enabled).
