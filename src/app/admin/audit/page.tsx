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
        <h1>Nhật ký</h1>
        <p className="lede">Không ghi mật khẩu, OTP hay bí mật SMTP.</p>
        <table>
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Hành động</th>
              <th>Kết quả</th>
              <th>Principal</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString("vi-VN")}</td>
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
