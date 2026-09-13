"use client";

import BrandMark from "./BrandMark";
import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";

export default function Footer() {
  const { t, lang } = useLang();
  return (
    <footer className="site-footer">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-8 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-espresso">
          <BrandMark /> {t("footer.tagline")}
        </p>
        <nav className="flex flex-wrap justify-center gap-4 py-3"><Link href="/about">{t("nav.about")}</Link><Link href="/suggest">{lang==="th"?"แนะนำร้าน":"Suggest a cafe"}</Link><Link href="/cafes">{lang==="th"?"แจ้งแก้ไขผ่านหน้าร้าน":"Report corrections on a cafe page"}</Link></nav>
        <p className="text-xs text-espresso/70">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> PhayaoHopper ·{" "}
          {t("footer.note")}
        </p>
      </div>
    </footer>
  );
}
