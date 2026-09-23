"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useAuth } from "./AuthProvider";
import { useFavorites } from "./FavoritesProvider";
import CafeSearch from "./CafeSearch";
import BrandMark from "./BrandMark";
import FeatureNav from "./FeatureNav";
import AccountProfileActions from "./AccountProfileActions";
import { useProfile } from "@/lib/use-profile";
import Icon from "./Icon";
import Image from "next/image";
export default function Navbar() {
  const { t, toggle, lang } = useLang(); const { user, loading, signOut } = useAuth(); const { slugs } = useFavorites(); const pathname = usePathname();
  const { profile } = useProfile();
  const [open,setOpen] = useState(false); const trigger = useRef<HTMLButtonElement>(null); const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (accountMenu.current?.open) {
        accountMenu.current.open = false;
        accountMenu.current.querySelector("summary")?.focus();
      } else if (open) {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (accountMenu.current?.open && !accountMenu.current.contains(event.target as Node)) {
        accountMenu.current.open = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);
  const links = [["/cafes", t("nav.cafes")], ["/map", t("nav.map")], ["/favorites", `${t("nav.favorites")}${slugs.length ? ` (${slugs.length})` : ""}`]];
  const close = () => setOpen(false);
  const initials = (profile?.display_name || user?.email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <header className="site-header">
      <div className="nav-main">
        <Link href="/" onClick={close} className="brand">
          <span className="brand-symbol"><BrandMark /></span>
          <span><strong>{t("brand.name")}</strong><small>{t("brand.sub")}</small></span>
        </Link>
        <div className="nav-search"><CafeSearch variant="navbar" /></div>
        <button className="ui-secondary language-toggle" onClick={toggle}>{t("lang.switchTo")}</button>
        <button ref={trigger} className="ui-secondary nav-toggle" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(value => !value)}>
          {open ? (lang === "th" ? "ปิดเมนู" : "Close menu") : (lang === "th" ? "เมนู" : "Menu")}
        </button>
        <nav id="main-navigation" className={`main-navigation ${open ? "is-open" : ""}`} aria-label={t("nav.main")}>
          {links.map(([href, label]) => <Link key={href} href={href} onClick={close} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
          {!loading && (user ? (
            <details ref={accountMenu} className="account-menu">
              <summary aria-label={lang === "th" ? "เปิดเมนูโปรไฟล์" : "Open profile menu"}>
                <span className="account-avatar">
                  {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={36} height={36} unoptimized /> : <span aria-hidden="true">{initials}</span>}
                </span>
                <span className="account-summary-label">{lang === "th" ? "โปรไฟล์" : "Profile"}</span>
                <Icon name="chevronDown" className="account-chevron" />
              </summary>
              <div className="account-menu-panel" onClick={event => {
                if ((event.target as HTMLElement).closest("a")) {
                  accountMenu.current?.removeAttribute("open");
                  close();
                }
              }}>
                <AccountProfileActions user={user} profile={profile} signOut={signOut} />
                <Link className="account-favorites-link" href="/visited">
                  {lang === "th" ? "ร้านโปรด" : "Places to revisit"}
                </Link>
                <Link className="account-favorites-link" href="/favorites">
                  {lang === "th" ? `ร้านที่อยากไป${slugs.length ? ` (${slugs.length})` : ""}` : `Want to visit${slugs.length ? ` (${slugs.length})` : ""}`}
                </Link>
                <FeatureNav />
              </div>
            </details>
          ) : <Link href="/login" onClick={close}>{t("nav.login")}</Link>)}
        </nav>
      </div>
    </header>
  );
}
