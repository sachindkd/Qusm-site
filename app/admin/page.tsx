import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getContent } from "@/lib/content";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.isAdmin) {
    redirect("/login");
  }
  const content = await getContent();
  return <AdminClient initialContent={content} email={session.user?.email ?? ""} />;
}
