"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
export default function BackToResults(){const router=useRouter();const {t}=useLang();return <Link href="/cafes" className="ui-secondary inline-block" onClick={e=>{try{const saved=JSON.parse(sessionStorage.getItem("cafe-results-return")||"null");if(saved && /^\/(cafes|map)(\?|$)/.test(saved.path)){e.preventDefault();sessionStorage.setItem("cafe-results-restore","1");router.push(saved.path,{scroll:false});}}catch{}}}>{t("detail.back")}</Link>;}
