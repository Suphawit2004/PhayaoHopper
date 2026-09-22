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
import { useProfile } from "@/lib/use-profile";
import Icon from "./Icon";
import Image from "next/image";
import ProfileDialog from "./ProfileDialog";
export default function Navbar() {
  const { t, toggle, lang } = useLang(); const { user, loading } = useAuth(); const { slugs } = useFavorites(); const pathname = usePathname();
  const { profile } = useProfile();
  const [open,setOpen] = useState(false); const trigger = useRef<HTMLButtonElement>(null); const accountMenu = useRef<HTMLDetailsElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
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
  const closeProfile = () => {
    setProfileOpen(false);
    accountMenu.current?.querySelector("summary")?.focus();
  };
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
                <div className="account-identity">
                  <span className="account-avatar account-avatar-large">
                    {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={48} height={48} unoptimized /> : <span aria-hidden="true">{initials}</span>}
                  </span>
                  <span className="account-identity-copy">
                    <strong>{profile?.display_name || user.email?.split("@")[0] || (lang === "th" ? "สมาชิก" : "Member")}</strong>
                    <small>{user.email}</small>
                  </span>
                </div>
                <button className="account-profile-link" type="button" onClick={() => {
                  setProfileOpen(true);
                  accountMenu.current?.removeAttribute("open");
                  close();
                }}>
                  {lang === "th" ? "จัดการโปรไฟล์" : "Manage profile"}<span aria-hidden="true">↗</span>
                </button>
                <Link className="account-favorites-link" href="/favorites" onClick={() => {
                  accountMenu.current?.removeAttribute("open");
                  close();
                }}>
                  {lang === "th" ? `ร้านโปรด${slugs.length ? ` (${slugs.length})` : ""}` : `Favorites${slugs.length ? ` (${slugs.length})` : ""}`}
                </Link>
                <FeatureNav />
              </div>
            </details>
          ) : <Link href="/login" onClick={close}>{t("nav.login")}</Link>)}
        </nav>
      </div>
      {user && profileOpen && <ProfileDialog onClose={closeProfile} />}
    </header>
  );
}
