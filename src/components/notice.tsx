import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Notice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <Alert variant={error ? "destructive" : "default"}>
      {error ? <CircleAlert /> : <CircleCheck />}
      <AlertDescription className="min-w-0 wrap-break-word">{error || message}</AlertDescription>
    </Alert>
  );
}
