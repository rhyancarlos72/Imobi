import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await getUser();
  // para quem não é admin a página simplesmente não existe
  if (!user || !isAdminEmail(user.email)) notFound();
  return <AdminPanel email={user.email!} />;
}
