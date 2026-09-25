import { requireSession } from "@/server/session";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getRecovery } from "@/server/portal";
import { getDb } from "@/server/db";

export default async function AccountPage() {
  const session = await requireSession();
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
        <a className="tile" href="/account/recovery">
          <strong>Email khôi phục</strong>
          <span>Thêm, đổi và xác minh địa chỉ nhận OTP.</span>
        </a>
        <a className="tile" href="/account/password">
          <strong>Đổi mật khẩu</strong>
          <span>Cập nhật mật khẩu mailbox trên Stalwart.</span>
        </a>
        {hasRecoveryAdminAccess(session.permissions) ? (
          <a className="tile" href="/admin/recovery">
            <strong>Quản trị khôi phục</strong>
            <span>Chỉ workflow recovery, không quản trị mail.</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
