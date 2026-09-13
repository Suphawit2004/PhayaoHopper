"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useAuth } from "./AuthProvider";
import { useFavorites } from "./FavoritesProvider";
import CafeSearch from "./CafeSearch";
import FeatureNav from "./FeatureNav";
export default function Navbar() {
  const { t, toggle, lang } = useLang(); const { user, loading } = useAuth(); const { slugs } = useFavorites(); const pathname = usePathname();
  const [open,setOpen] = useState(false); const trigger = useRef<HTMLButtonElement>(null); const root = useRef<HTMLElement>(null);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);const d=root.current?.querySelector("details"); if(d?.open){d.open=false;d.querySelector("summary")?.focus();}else if(open) trigger.current?.focus();}};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[open]);
  const links=[["/cafes",t("nav.cafes")],["/map",t("nav.map")],["/favorites",`${t("nav.favorites")}${slugs.length ? " ("+slugs.length+")":""}`]];
  const close=()=>setOpen(false);
  return <header ref={root} className="site-header"><div className="nav-main">
    <Link href="/" onClick={close} className="brand"><span aria-hidden="true">☕</span><span><strong>{t("brand.name")}</strong><small>{t("brand.sub")}</small></span></Link>
    <div className="nav-search"><CafeSearch /></div>
    <button className="ui-secondary language-toggle" onClick={toggle}>{t("lang.switchTo")}</button>
    <button ref={trigger} className="ui-secondary nav-toggle" aria-expanded={open} aria-controls="main-navigation" onClick={()=>setOpen(v=>!v)}>{open ? (lang==="th"?"ปิดเมนู":"Close menu"):(lang==="th"?"เมนู":"Menu")}</button>
    <nav id="main-navigation" className={`main-navigation ${open ? "is-open":""}`} aria-label={t("nav.main")}>{links.map(([href,label])=><Link key={href} href={href} onClick={close} aria-current={pathname===href?"page":undefined}>{label}</Link>)}
      {!loading && (user ? <details className="account-menu"><summary>{t("nav.profile")}</summary><div onClick={e=>{if((e.target as HTMLElement).closest("a")){e.currentTarget.parentElement?.removeAttribute("open");close();}}}><Link href="/profile">{t("profile.title")}</Link><FeatureNav /></div></details>:<Link href="/login" onClick={close}>{t("nav.login")}</Link>)}
    </nav>
  </div></header>;
}
