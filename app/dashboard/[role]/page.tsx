import { notFound } from "next/navigation";
import { Suspense } from "react";
import { roles } from "@/lib/roles";
import { Workspace } from "@/components/workspace";
import { requirePageAccess } from '@/lib/server/pages';

export function generateStaticParams() {
  return roles.map((role) => ({ role: role.id }));
}
async function RoleContent({ params }: { params: Promise<{ role: string }> }) {
  const { role: id } = await params;
  await requirePageAccess(id);
  const role = roles.find((item) => item.id === id);
  if (!role) notFound();
  return <Workspace key={role.id} role={role} />;
}

export default function DashboardPage({ params }: { params: Promise<{ role: string }> }) {
  return <Suspense fallback={<main className="not-found" aria-busy="true">Loading your workspace…</main>}><RoleContent params={params} /></Suspense>;
}
