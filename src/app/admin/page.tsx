import { listAcknowledgements } from "@/lib/acknowledgements";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import { isUsingPostgres } from "@/lib/db";
import { ackIsCurrent } from "@/lib/players";

export const dynamic = "force-dynamic";

function formatWhen(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatJersey(hasJersey: boolean | null): string {
  if (hasJersey === true) return "Has jersey";
  if (hasJersey === false) return "Needs jersey";
  return "—";
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

  const currentHash = agreementHash();
  const latestByPlayer = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.player_id) continue;
    const key = String(row.player_id);
    if (!latestByPlayer.has(key)) latestByPlayer.set(key, row);
  }

  return (
    <main className="admin-page">
      <h1>Acknowledgements</h1>
      <p className="admin-meta">
        Storage: {usingPostgres ? "Postgres" : "local sample (PGlite)"} ·{" "}
        {rows.length} record{rows.length === 1 ? "" : "s"} · club agreement{" "}
        <span className="mono">{AGREEMENT_VERSION}</span>
        {!usingPostgres
          ? " · local sample store (.data) while DATABASE_URL is unset"
          : ""}
      </p>

      {error ? <p className="admin-error">{error}</p> : null}

      {!error && latestByPlayer.size > 0 ? (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="admin-subhead">Membership (latest per player)</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Messenger</th>
                  <th>Jersey</th>
                  <th>Latest version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...latestByPlayer.values()].map((row) => {
                  const current = ackIsCurrent(
                    row.agreement_version,
                    row.agreement_hash,
                  );
                  return (
                    <tr key={`p-${String(row.player_id)}`}>
                      <td>{row.full_name}</td>
                      <td>{row.messenger || "—"}</td>
                      <td>{formatJersey(row.has_swh_jersey)}</td>
                      <td>
                        <span className="mono">{row.agreement_version}</span>
                      </td>
                      <td>
                        <span className={current ? "status-ok" : "status-stale"}>
                          {current ? "Current" : "Needs re-ack"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!error && rows.length === 0 ? (
        <p className="admin-empty">No acknowledgements yet.</p>
      ) : null}

      {!error && rows.length > 0 ? (
        <div className="admin-table-wrap">
          <h2 className="admin-subhead">All acknowledgement rows</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Messenger</th>
                <th>Jersey</th>
                <th>Version</th>
                <th>Linked</th>
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
                  <td>{row.messenger || "—"}</td>
                  <td>{formatJersey(row.has_swh_jersey)}</td>
                  <td>
                    <span className="mono">{row.agreement_version}</span>
                    <div
                      className="mono"
                      style={{ opacity: 0.55, fontSize: "0.75rem" }}
                    >
                      {row.agreement_hash.slice(0, 12)}…
                      {row.agreement_hash === currentHash ? " · current" : ""}
                    </div>
                  </td>
                  <td>{row.player_id ? "Profile" : "Guest"}</td>
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
