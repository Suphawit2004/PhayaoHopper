"use client";
import {useUi} from "@/i18n/UiText";
import { deleteMenu } from "@/app/actions/cafe-management";
import ActionForm from "./ActionForm";
export default function MenuDeleteButton({ slug, id }: { slug: string; id: string }) {
  const ui=useUi();
  return <div className="mt-4"><ActionForm label={ui("ลบเมนู")} action={async () => window.confirm(ui("ลบเมนูนี้?")) ? deleteMenu(slug, id) : { ok: false, message: ui("ยกเลิกการลบ") }}>{null}</ActionForm></div>;
}
