"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { useAuth } from "./AuthProvider";
const links = [
  ["/chat", "ผู้ช่วยค้นหาร้าน", "Cafe assistant"],
  ["/membership", "บัตรสมาชิก", "Membership"],
  ["/suggest", "แนะนำร้านใหม่", "Suggest a cafe"],
  ["/owner", "สำหรับเจ้าของร้าน", "Cafe owners"],
  ["/admin", "ผู้ดูแลระบบ", "Administration"],
];
export default function FeatureNav() {
  const { lang } = useLang();
  const pathname = usePathname();
  const { user, loading, isOwner, isAdmin } = useAuth();
  if (loading || !user) return null;
  const visibleLinks = links.filter(([href]) => href === "/owner" ? isOwner : href === "/admin" ? isAdmin : true);
  return <nav aria-label={lang === "th" ? "บริการเพิ่มเติม" : "More services"} className="account-services">
    <div>{visibleLinks.map(([href, th, en]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}>{lang === "th" ? th : en}</Link>)}</div>
  </nav>;
}
