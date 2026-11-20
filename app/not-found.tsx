import Link from "next/link";
import { Brand } from "@/components/shared/identity";

export default function NotFound() {
  return <main className="not-found"><Brand /><span className="eyebrow">Page unavailable</span><h1>Let’s find your workspace.</h1><p>This page or role doesn’t exist. Choose a hospital workspace to continue.</p><Link href="/auth/workspace" className="button primary">Browse workspaces</Link></main>;
}
