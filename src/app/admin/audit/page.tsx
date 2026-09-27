import { AdminNav } from "@/components/admin-nav";
import { listAudit } from "@/server/audit";
import { getDb } from "@/server/db";
import { requireAdminSession } from "@/server/session";

export default async function AuditPage() {
  await requireAdminSession();
  const logs = listAudit(getDb(), 200);
  return (
    <>
      <AdminNav />
      <section className="card">
        <h1>Audit log</h1>
        <p className="lede">Passwords, OTPs, and SMTP secrets are not logged.</p>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Result</th>
              <th>Principal</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString("en-US")}</td>
                <td>{row.action}</td>
                <td>{row.result}</td>
                <td>{row.principalId || "—"}</td>
                <td>{row.ip || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
