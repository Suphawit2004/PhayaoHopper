"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import dynamic from "next/dynamic";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { submitSuggestion } from "@/app/actions/suggestions";

const MapPicker = dynamic(() => import("./map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-xl bg-sand text-sm font-medium text-espresso/70">
      ⏳ …
    </div>
  ),
});

interface FormState {
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
  priceRange: "" | "1" | "2";
  note: string;
  contact: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  address: "",
  openTime: "",
  closeTime: "",
  priceRange: "",
  note: "",
  contact: "",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const subscribeHydration = () => () => {};
export default function SuggestView() {
 const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
 const {lang}=useLang();
 return hydrated ? <SuggestionForm /> : <p role="status" className="feature-page">{lang==="th"?"กำลังโหลดแบบฟอร์ม…":"Loading form…"}</p>;
}
function readDraft() {
 try { const saved=JSON.parse(sessionStorage.getItem("cafe-suggestion-draft")||"null");
 const form={...INITIAL_FORM,...Object.fromEntries(Object.entries(saved?.form??{}).filter(([key,value])=>key in INITIAL_FORM&&typeof value==="string"))};
 const coords:Array<number>|null=Array.isArray(saved?.coords)&&saved.coords.length===2&&saved.coords.every((n:unknown)=>typeof n==="number"&&Number.isFinite(n))?saved.coords:null;
 return {form,coords:coords as [number,number]|null};
 }catch{return {form:INITIAL_FORM,coords:null};}
}
function SuggestionForm() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const supabaseReady = getSupabaseBrowser() !== null;

  const coordsRef = useRef<HTMLFieldSetElement>(null);
  const [saved] = useState(readDraft);
  const [coordDraft, setCoordDraft] = useState({lat:saved.coords?String(saved.coords[0]):"",lng:saved.coords?String(saved.coords[1]):""});
  const [form, setForm] = useState<FormState>(saved.form);
  const [coords, setCoords] = useState<[number, number] | null>(saved.coords);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<"tooBig" | "wrongType" | "upload" | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [rateLimited, setRateLimited] = useState(false);
  const [showCoordError, setShowCoordError] = useState(false);

  const patch = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }));

  useEffect(() => { if(status !== "sent") {try {sessionStorage.setItem("cafe-suggestion-draft",JSON.stringify({form,coords}));}catch{}} }, [form,coords,status]);

  // Single owner of the blob-URL lifecycle: revoke whenever the preview is
  // replaced or cleared, and on unmount.
  useEffect(() => {
    if (!photoPreview) return;
    return () => {
      URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const pickPhoto = (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("wrongType");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("tooBig");
      return;
    }
    clearPhoto();
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const resetAll = () => {
    clearPhoto();
    setForm(INITIAL_FORM);
    setCoords(null);
    setStatus("idle");
    setShowCoordError(false);
    setPhotoError(null);
    setRateLimited(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      setShowCoordError(true);
      coordsRef.current?.scrollIntoView({block:"center"}); coordsRef.current?.focus();
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    setStatus("sending");
    setPhotoError(null);
    setRateLimited(false);

    const res = await submitSuggestion({
      name: form.name.trim(),
      address: form.address.trim() || null,
      openTime: form.openTime || null,
      closeTime: form.closeTime || null,
      priceRange: form.priceRange === "" ? null : Number(form.priceRange),
      note: form.note.trim() || null,
      contact: form.contact.trim() || null,
      lat: coords[0],
      lng: coords[1],
      photo: photoFile,
    }).catch(() => ({ ok: false, error: "failed" } as const));

    if (res.ok) {
      setStatus("sent");
      try {sessionStorage.removeItem("cafe-suggestion-draft");} catch {}
      return;
    }

    if (res.error === "rate_limited") {
      setStatus("error");
      setRateLimited(true);
      return;
    }
    if (res.error === "photo_too_big" || res.error === "photo_wrong_type" || res.error === "upload_failed") {
      setStatus("error");
      setPhotoError(res.error === "photo_too_big" ? "tooBig" : res.error === "photo_wrong_type" ? "wrongType" : "upload");
      return;
    }
    setStatus("error");
  };

  if (status === "sent") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
          <p className="text-lg font-bold text-emerald-900">{t("suggest.success")}</p><p className="mt-3">{lang==="th"?"ผู้ดูแลจะตรวจข้อมูลก่อนเผยแพร่ร้าน":"An administrator will check the details before publishing the cafe."}</p><Link href="/cafes" className="ui-secondary mt-4">{t("nav.cafes")}</Link>
          <button
            type="button"
            onClick={resetAll}
            className="mt-6 rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            ➕ {t("suggest.successAgain")}
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3 text-sm outline-none transition focus:border-latte focus:bg-white";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-espresso">☕ {t("suggest.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-espresso/70">{t("suggest.desc")}</p>
      </header>

      {!supabaseReady && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ {t("db.notConfigured")}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{lang==="th"?"ข้อมูลหลัก":"Cafe details"}</h2><p>{lang==="th"?"จำเป็น: ชื่อร้านและพิกัด ช่องอื่นไม่บังคับ":"Required: cafe name and coordinates. Other fields are optional."}</p>
        <div>
          <label htmlFor="sg-name" className="block text-sm font-semibold text-espresso">
            {t("suggest.name")}
          </label>
          <input
            id="sg-name"
            type="text"
            required
            minLength={1}
            maxLength={120}
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t("suggest.namePh")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="sg-address" className="block text-sm font-semibold text-espresso">
            {t("suggest.address")}
          </label>
          <input
            id="sg-address"
            type="text"
            maxLength={300}
            value={form.address}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder={t("suggest.addressPh")}
            className={inputClass}
          />
        </div>

        <fieldset ref={coordsRef} tabIndex={-1} className="form-section">
          <legend>{t("suggest.location")}</legend>
          <div className="grid grid-cols-2 gap-3"><label>{lang==="th"?"ละติจูด":"Latitude"}<input type="number" step="any" min={19} max={20} value={coordDraft.lat} onChange={e=>setCoordDraft(v=>({...v,lat:e.target.value}))} className={inputClass}/></label><label>{lang==="th"?"ลองจิจูด":"Longitude"}<input type="number" step="any" min={99.6} max={100.2} value={coordDraft.lng} onChange={e=>setCoordDraft(v=>({...v,lng:e.target.value}))} className={inputClass}/></label></div>
          <button type="button" className="ui-secondary mt-3" onClick={()=>{const lat=Number(coordDraft.lat),lng=Number(coordDraft.lng);if(coordDraft.lat&&coordDraft.lng&&lat>=19&&lat<=20&&lng>=99.6&&lng<=100.2){setCoords([lat,lng]);setShowCoordError(false);}else{setShowCoordError(true);coordsRef.current?.focus();}}}>{lang==="th"?"ใช้พิกัดที่กรอก":"Use these coordinates"}</button>
          <p className="mt-0.5 text-xs text-espresso/60">
            🖱️ {t("suggest.locationHint")}
            {coords && (
              <span className="ml-1 font-mono font-semibold text-coffee">
                [{coords[0]}, {coords[1]}]
              </span>
            )}
          </p>
          <div className="mt-2 h-72 overflow-hidden rounded-xl border border-[#e8dcc8]">
            <MapPicker
              value={coords}
              onChange={(lat, lng) => {
                setCoords([lat, lng]);
                setCoordDraft({lat:String(lat),lng:String(lng)});
                setShowCoordError(false);
              }}
              className="h-full w-full"
            />
          </div>
          {showCoordError && (
            <p className="mt-1.5 text-xs font-semibold text-rose-700">⚠️ {t("suggest.pickFirst")}</p>
          )}
        </fieldset>

        <div>
          <span className="block text-sm font-semibold text-espresso">{t("suggest.photo")}</span>
          <p className="mt-0.5 text-xs text-espresso/60">{t("suggest.photoHint")}</p>

          {!user ? <Link href="/login?next=/suggest" className="mt-3 inline-block underline">{lang==="th"?"เข้าสู่ระบบเพื่อแนบรูป (บันทึกร่างแล้ว)":"Sign in to attach a photo (draft saved)"}</Link> : photoPreview ? (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-[#e8dcc8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="" className="max-h-56 w-full object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label={t("suggest.photoRemove")}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-sm shadow transition hover:bg-white"
              >
                ✕
              </button>
              <label className="absolute bottom-2 right-2 cursor-pointer focus-within:ring-2 focus-within:ring-teal-700 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-coffee shadow transition hover:bg-white">
                🔄 {t("suggest.photoChange")}
                <input
                  type="file"
                  accept={PHOTO_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
              </label>
            </div>
          ) : (
            <label className="mt-2 flex focus-within:ring-2 focus-within:ring-teal-700 cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[#d9c9ac] bg-sand/30 px-4 py-8 text-center transition hover:border-latte hover:bg-sand/50">
              <span className="text-3xl" aria-hidden>📷</span>
              <span className="text-sm font-semibold text-coffee">{t("suggest.choosePhoto")}</span>
              <input
                type="file"
                accept={PHOTO_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
            </label>
          )}

          {photoError === "tooBig" && (
            <p className="mt-1.5 text-xs font-semibold text-rose-700">⚠️ {t("suggest.photoTooBig")}</p>
          )}
          {photoError === "wrongType" && (
            <p className="mt-1.5 text-xs font-semibold text-rose-700">⚠️ {t("suggest.photoTypeError")}</p>
          )}
          {photoError === "upload" && (
            <p className="mt-1.5 text-xs font-semibold text-rose-700">⚠️ {t("suggest.photoUploadError")}</p>
          )}
        </div>

        <h2 className="form-section text-xl font-bold">{lang==="th"?"ข้อมูลเพิ่มเติม (ไม่บังคับ)":"Additional information (optional)"}</h2>
        <div>
          <span className="block text-sm font-semibold text-espresso">{t("suggest.hours")}</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="time"
              aria-label={t("suggest.openLabel")}
              value={form.openTime}
              onChange={(e) => patch({ openTime: e.target.value })}
              className="flex-1 rounded-xl border border-[#e8dcc8] bg-sand/40 px-3 py-2.5 text-sm outline-none focus:border-latte focus:bg-white"
            />
            <span className="text-espresso/50">–</span>
            <input
              type="time"
              aria-label={t("suggest.closeLabel")}
              value={form.closeTime}
              onChange={(e) => patch({ closeTime: e.target.value })}
              className="flex-1 rounded-xl border border-[#e8dcc8] bg-sand/40 px-3 py-2.5 text-sm outline-none focus:border-latte focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sg-price" className="block text-sm font-semibold text-espresso">
            {t("suggest.price")}
          </label>
          <select
            id="sg-price"
            value={form.priceRange}
            onChange={(e) => patch({ priceRange: e.target.value as FormState["priceRange"] })}
            className="mt-1.5 w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-3 py-2.5 text-sm font-medium outline-none focus:border-latte focus:bg-white"
          >
            <option value="">{t("suggest.priceAny")}</option>
            <option value="1">฿ {t("cafes.priceBudget")}</option>
            <option value="2">฿฿ {t("cafes.priceMid")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="sg-note" className="block text-sm font-semibold text-espresso">
            {t("suggest.note")}
          </label>
          <textarea
            id="sg-note"
            rows={4}
            maxLength={500}
            value={form.note}
            onChange={(e) => patch({ note: e.target.value })}
            placeholder={t("suggest.notePh")}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="sg-contact" className="block text-sm font-semibold text-espresso">
            {t("suggest.contact")}
          </label>
          <input
            id="sg-contact"
            type="text"
            maxLength={120}
            value={form.contact}
            onChange={(e) => patch({ contact: e.target.value })}
            placeholder={t("suggest.contactPh")}
            className={inputClass}
          />
        </div>

        {rateLimited && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ⏳ {t("suggest.rateLimited")}
          </p>
        )}

        {status === "error" && !photoError && !rateLimited && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">⚠️ {t("suggest.error")}</p>
        )}

        <button
          type="submit"
          disabled={status === "sending" || !supabaseReady}
          className="rounded-full bg-coffee px-6 py-3 text-sm font-bold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
        >
          {status === "sending" ? `⏳ ${t("suggest.sending")}` : `📮 ${t("suggest.submit")}`}
        </button>
      </form>
    </div>
  );
}
