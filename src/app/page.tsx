import { redirect } from "next/navigation";

// Root URL → always redirect to the DApp login page.
// Staff/Admin login is at /backend/login
export default function RootPage() {
  redirect("/dapp/login");
}
