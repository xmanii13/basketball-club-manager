import { listAcknowledgements } from "@/lib/acknowledgements";
import { isUsingPostgres } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatWhen(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const adminToken = process.env.ADMIN_TOKEN?.trim() ?? "";
  const usingPostgres = isUsingPostgres();
  const queryToken = params.token?.trim() ?? "";

  const allowed =
    adminToken !== ""
      ? queryToken === adminToken
      : !usingPostgres;

  if (!allowed) {
    return (
      <main className="admin-page">
        <h1>Acknowledgements</h1>
        <p className="admin-error">
          {adminToken === "" && usingPostgres
            ? "Admin list is locked. Set ADMIN_TOKEN and open /admin?token=…"
            : "Unauthorized. Open /admin?token=… with the admin token."}
        </p>
        <p>
          <a href="/">← Back to agreement</a>
        </p>
      </main>
    );
  }

  let rows: Awaited<ReturnType<typeof listAcknowledgements>> = [];
  let error: string | null = null;
  try {
    rows = await listAcknowledgements(200);
  } catch {
    error = "Could not load acknowledgements.";
  }

  return (
    <main className="admin-page">
      <h1>Acknowledgements</h1>
      <p className="admin-meta">
        Storage: {usingPostgres ? "Postgres" : "local sample (PGlite)"} ·{" "}
        {rows.length} record{rows.length === 1 ? "" : "s"}
        {!usingPostgres
          ? " · local sample store (.data) while DATABASE_URL is unset"
          : ""}
      </p>

      {error ? <p className="admin-error">{error}</p> : null}

      {!error && rows.length === 0 ? (
        <p className="admin-empty">No acknowledgements yet.</p>
      ) : null}

      {!error && rows.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Jersey / age</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>{formatWhen(row.created_at)}</td>
                  <td>{row.full_name}</td>
                  <td>
                    {row.contact}
                    <div className="mono" style={{ opacity: 0.65 }}>
                      {row.contact_type}
                    </div>
                  </td>
                  <td>{row.role}</td>
                  <td>{row.jersey_or_age_group || "—"}</td>
                  <td>
                    <span className="mono">{row.agreement_version}</span>
                    <div className="mono" style={{ opacity: 0.55, fontSize: "0.75rem" }}>
                      {row.agreement_hash.slice(0, 12)}…
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p style={{ marginTop: "1.5rem" }}>
        <a href="/">← Back to agreement</a>
      </p>
    </main>
  );
}
