import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const paths: Record<string, string> = {
  arrow: "M5 12h14m-5-5 5 5-5 5", search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0", calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z", grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", record: "M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6", heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z", doctor: "M6 3v5a5 5 0 0 0 10 0V3M4 3h4m6 0h4m-7 10v3a5 5 0 0 0 10 0v-3m-2-2h4v4h-4z", pharmacy: "m8 4 12 12M5 19a6 6 0 0 1 0-8l6-6a6 6 0 0 1 8 8l-6 6a6 6 0 0 1-8 0Z", nurse: "M8 3h8v5H8zM12 8v4m-4-2h8M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3", lab: "M9 2h6m-5 0v7L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V2M7 15h10", imaging: "M3 3h18v18H3zM8 7l8 10M16 7 8 17M7 12h10", cashier: "M3 5h18v14H3zM3 9h18m-4 6h2", claims: "M14 2H5v20h14V7l-5-5Zm-6 12 3 3 5-6", admin: "M12 3 2 8l10 5 10-5-10-5ZM4 12v6l8 4 8-4v-6", platform: "M3 3h18v7H3zM3 14h18v7H3zM7 6v1m0 10v1m10-12h1m-1 11h1", reception: "M4 21v-4a8 8 0 0 1 16 0v4M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0", bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12h4", chevron: "m9 5 7 7-7 7", menu: "M3 6h18M3 12h18M3 18h18", close: "m6 6 12 12M6 18 18 6", lock: "M5 10h14v12H5zM8 10V6a4 4 0 0 1 8 0v4", eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0", check: "m5 12 4 4L19 6", logout: "M9 3H3v18h6m5-14 5 5-5 5m-5-5h10", clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", chart: "M4 3v18h17M8 16v-5m5 5V7m5 9v-8",
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name === "records" ? "record" : name] || paths.record} /></svg>;
}
export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="HMS home"><Image src="/images/logo-symbol.svg" alt="" width={36} height={36} /><span>HMS<span className="brand-period">.</span></span></Link>;
}
export function Status({ children }: { children: React.ReactNode }) {
  const value = String(children);
  const tones: Record<string,string> = { rejected:'danger',failed:'danger',conflict:'danger',expired:'danger',critical:'danger',suspended:'danger',unsigned:'warning',draft:'warning',pending:'warning',partial:'warning',due:'warning',unpaid:'warning','low stock':'warning','refund requested':'warning',clarification:'warning',signed:'success',reviewed:'success',verified:'success',completed:'success',released:'success',dispensed:'success',paid:'success',active:'success',available:'success',recorded:'success',accepted:'success',updated:'success',cancelled:'neutral',merged:'neutral',disabled:'neutral',unavailable:'neutral' };
  const tone = tones[value.toLowerCase()] || 'info';
  const colours:Record<string,string>={danger:'border-red-200 bg-red-50 text-red-800',warning:'border-amber-200 bg-amber-50 text-amber-800',success:'border-emerald-200 bg-emerald-50 text-emerald-800',neutral:'border-slate-200 bg-slate-100 text-slate-700',info:'border-blue-200 bg-blue-50 text-blue-800'};
  return <Badge variant="outline" className={`badge ${tone} ${colours[tone]}`}><span />{children}</Badge>;
}
