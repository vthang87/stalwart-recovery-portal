import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAudit } from "@/server/audit";
import { getDb } from "@/server/db";
import { requireAdminSession } from "@/server/session";

export default async function AuditPage() {
  await requireAdminSession();
  const logs = listAudit(getDb(), 200);
  return (
    <>
      <AdminNav />
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Passwords, OTPs, and SMTP secrets are not logged.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.createdAt).toLocaleString("en-US")}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.result}</TableCell>
                  <TableCell>{row.principalId || "—"}</TableCell>
                  <TableCell>{row.ip || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
