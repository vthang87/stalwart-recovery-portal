"use client";

import { useState } from "react";
import { appPath } from "@/lib/base-path";
import { postJson } from "@/lib/client";

type Principal = {
  id: string;
  email: string;
  name: string;
  recoveryEmail: string | null;
  verified: boolean;
};

export function AdminRecovery({ csrf }: { csrf: string }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Principal[]>([]);
  const [selected, setSelected] = useState<Principal | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h1>Recovery admin</h1>
      <p className="lede">Find a Stalwart principal and manage recovery email, verification, and OTP revocation only.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <label htmlFor="q">Find account</label>
      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />
      <button
        className="primary"
        type="button"
        disabled={pending}
        onClick={() =>
          void run(async () => {
            const res = await fetch(appPath(`/api/admin/principals/search?q=${encodeURIComponent(query)}`), {
              headers: { "x-csrf-token": csrf },
            });
            const data = (await res.json()) as { principals?: Principal[]; error?: string };
            if (!res.ok) throw new Error(data.error || "Not found");
            setRows(data.principals || []);
          })
        }
      >
        Search
      </button>
      <div className="list">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => {
              setSelected(row);
              setEmail(row.recoveryEmail || "");
            }}
          >
            {row.email} {row.verified ? "· verified" : ""}
          </button>
        ))}
      </div>
      {selected ? (
        <div>
          <h2>{selected.email}</h2>
          <label htmlFor="recovery">Recovery email</label>
          <input id="recovery" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <button
              className="primary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(
                    `/api/admin/recovery/${encodeURIComponent(selected.id)}`,
                    csrf,
                    { recoveryEmail: email, accountEmail: selected.email },
                    "PUT",
                  );
                  setMessage("Saved. Re-verify the email if the address changed.");
                })
              }
            >
              Save
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}/send-verification`, csrf);
                  setMessage("Verification code resent.");
                })
              }
            >
              Send verification
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}/revoke-challenges`, csrf);
                  setMessage("Active codes revoked.");
                })
              }
            >
              Revoke OTP
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}`, csrf, undefined, "DELETE");
                  setEmail("");
                  setMessage("Recovery email removed.");
                })
              }
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
