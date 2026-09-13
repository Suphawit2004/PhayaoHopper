"use client";
import {useUi} from "@/i18n/UiText";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MutationResult } from "@/app/actions/cafe-management";
export default function ActionForm({ action, children, label = "บันทึก", reset = false }: {
  action: (form: FormData) => Promise<MutationResult>; children: React.ReactNode; label?: string; reset?: boolean;
}) {
  const ui=useUi();
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const [ok,setOk]=useState<boolean|null>(null);
  const router = useRouter();
  return <form className="feature-form" onInvalidCapture={e=>{let p=(e.target as HTMLElement).parentElement;while(p&&p!==e.currentTarget){if(p instanceof HTMLDetailsElement)p.open=true;p=p.parentElement;}}} onSubmit={async e => {
    e.preventDefault(); if(pending)return; const form = e.currentTarget; setPending(true); setMessage("");
    try { const result = await action(new FormData(form)); setMessage(result.message);setOk(result.ok);
      if (result.ok) { if (reset) form.reset(); router.refresh(); }
    } catch { setOk(false); setMessage(ui("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่")); } finally { setPending(false); }
  }}>
    <fieldset disabled={pending} className="grid gap-4">{children}</fieldset>
    <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className="feature-button">{pending ? ui("กำลังบันทึก…") : ui(label)}</button>{message && <p role="status" data-error={ok===false} className="status-message">{ui(message)}</p>}</div>
  </form>;
}
