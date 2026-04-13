import { redirect } from "next/navigation";

// Any unmatched URL → /dapp/login (default entry point)
// Staff/Admin access → /backend/login
export default function NotFound() {
  redirect("/dapp/login");
}
