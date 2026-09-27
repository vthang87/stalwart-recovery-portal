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
      <h1>Account</h1>
      <p className="lede">{session.email}</p>
      <p>
        Recovery email: {row?.recoveryEmail || "not set"}{" "}
        {row?.recoveryEmail ? <span className="status">{verified ? "Verified" : "Unverified"}</span> : null}
      </p>
      <div className="grid">
        <Link className="tile" href="/recovery">
          <strong>Recovery email</strong>
          <span>Add, change, and verify the address that receives OTPs.</span>
        </Link>
        <Link className="tile" href="/password">
          <strong>Change password</strong>
          <span>Update the mailbox password on Stalwart.</span>
        </Link>
        {hasRecoveryAdminAccess(session.permissions) ? (
          <Link className="tile" href="/admin/recovery">
            <strong>Recovery admin</strong>
            <span>Recovery workflow only — not full mail administration.</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
