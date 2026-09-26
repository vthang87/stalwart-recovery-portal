import Link from "next/link";
import { redirect } from "next/navigation";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getDb } from "@/server/db";
import { getRecovery } from "@/server/portal";
import { getSession } from "@/server/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const row = getRecovery(getDb(), session.principalId);
  const verified = Boolean(row?.verifiedAt);
  return (
    <section className="card">
      <h1>Tài khoản</h1>
      <p className="lede">{session.email}</p>
      <p>
        Email khôi phục: {row?.recoveryEmail || "chưa thiết lập"}{" "}
        {row?.recoveryEmail ? <span className="status">{verified ? "Đã xác minh" : "Chưa xác minh"}</span> : null}
      </p>
      <div className="grid">
        <Link className="tile" href="/recovery">
          <strong>Email khôi phục</strong>
          <span>Thêm, đổi và xác minh địa chỉ nhận OTP.</span>
        </Link>
        <Link className="tile" href="/password">
          <strong>Đổi mật khẩu</strong>
          <span>Cập nhật mật khẩu mailbox trên Stalwart.</span>
        </Link>
        {hasRecoveryAdminAccess(session.permissions) ? (
          <Link className="tile" href="/admin/recovery">
            <strong>Quản trị khôi phục</strong>
            <span>Chỉ workflow recovery, không quản trị mail.</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
