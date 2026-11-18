// Mirrors identity.dev.ts for Next/Turbopack (identity.ts imports ./identity.dev.js).
// Edit identity.dev.ts for the intended source of truth, then keep this in sync.
// Never put a real person's identity here.

/** @type {{ sub: string, email: string, name?: string, teamId?: number, teamRole?: "admin" | "member" } | null} */
export const DEV_VIEWER = {
  sub: "user:dev",
  email: "dev@example.com",
  name: "Dev Viewer",
  teamId: 1,
  teamRole: "admin",
};
