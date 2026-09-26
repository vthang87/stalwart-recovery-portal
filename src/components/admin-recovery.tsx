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
      setError(err instanceof Error ? err.message : "Thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h1>Quản trị khôi phục</h1>
      <p className="lede">Tìm principal trên Stalwart và chỉ quản lý email khôi phục, xác minh, thu hồi OTP.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <label htmlFor="q">Tìm tài khoản</label>
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
            if (!res.ok) throw new Error(data.error || "Không tìm được");
            setRows(data.principals || []);
          })
        }
      >
        Tìm
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
            {row.email} {row.verified ? "· đã xác minh" : ""}
          </button>
        ))}
      </div>
      {selected ? (
        <div>
          <h2>{selected.email}</h2>
          <label htmlFor="recovery">Email khôi phục</label>
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
                  setMessage("Đã lưu. Email cần xác minh lại nếu địa chỉ thay đổi.");
                })
              }
            >
              Lưu
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}/send-verification`, csrf);
                  setMessage("Đã gửi lại mã xác minh.");
                })
              }
            >
              Gửi xác minh
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}/revoke-challenges`, csrf);
                  setMessage("Đã thu hồi các mã còn hiệu lực.");
                })
              }
            >
              Thu hồi OTP
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}`, csrf, undefined, "DELETE");
                  setEmail("");
                  setMessage("Đã xóa email khôi phục.");
                })
              }
            >
              Xóa
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
