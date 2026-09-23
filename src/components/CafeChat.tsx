"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";
import { useCatalog } from "./CatalogProvider";
import CafeThumb from "./CafeThumb";
import Icon from "./Icon";

type Recommendation = {
  slug: string;
  name: string;
  openTime: string;
  closeTime: string;
  closedDays: number[];
  address: string;
};

type Reply = {
  message: string;
  mode: string;
  fallbackReason?: string;
  cafes: Recommendation[];
};

type Turn = { question: string; reply: Reply };

export default function CafeChat() {
  const { lang, tr } = useLang();
  const cafes = useCatalog();
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const thai = lang === "th";

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "auto" });
  }, [turns, pending]);

  useEffect(() => {
    const input = composerInput.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [query]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    setPending(true);
    setError("");
    setFailed(text);
    try {
      const response = await fetch("/api/cafe-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, lang }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error("Assistant request failed");
      const reply: Reply = await response.json();
      setTurns((current) => [...current.slice(-19), { question: text, reply }]);
      setQuery("");
      setFailed("");
    } catch {
      setError(thai
        ? "ส่งคำถามไม่สำเร็จ ข้อความยังอยู่ในช่องพิมพ์ ลองส่งอีกครั้งได้เลย"
        : "Your question could not be sent and is still in the input. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const prompts = thai
    ? ["แนะนำคาเฟ่", "บ้านบานน์เปิดกี่โมง", "มีร้านสำหรับนั่งทำงานไหม"]
    : ["Cafe recommendations", "What time does Baan Baann open?", "Where can I work for a while?"];

  function fallbackDescription(reason?: string) {
    if (reason === "simulation") return thai ? "โหมดทดสอบจำลอง: ใช้ข้อมูลร้านในระบบ โดยไม่เรียก Gemini หรือใช้โควตา" : "Simulation mode: uses the cafe catalogue without calling Gemini or consuming quota.";
    if (reason === "not_configured") return thai ? "Gemini ยังไม่พร้อม ระบบจึงค้นจากข้อมูลร้านที่มี" : "Gemini is not configured, so this uses the cafe catalogue.";
    if (reason === "sign_in_required") return thai ? "เข้าสู่ระบบเพื่อใช้ Gemini เมื่อเปิดให้บริการ · คำตอบนี้ค้นจากข้อมูลร้าน" : "Sign in for Gemini when available · this answer uses the cafe catalogue.";
    if (reason === "account_quota") return thai ? "สิทธิ์ถาม Gemini ของบัญชีวันนี้ครบแล้ว จึงค้นจากข้อมูลร้านแทน" : "Your account's Gemini allowance is used for today, so the cafe catalogue was used.";
    if (reason === "quota_check_failed") return thai ? "ตรวจสิทธิ์ใช้ Gemini ไม่สำเร็จ จึงค้นจากข้อมูลร้านแทน" : "Gemini access could not be checked, so the cafe catalogue was used.";
    if (reason === "provider_rate_limit") return thai ? "Gemini กำลังจำกัดจำนวนคำขอ จึงค้นจากข้อมูลร้านแทน" : "Gemini is limiting requests, so the cafe catalogue was used.";
    if (reason === "provider_timeout") return thai ? "Gemini ตอบช้าเกินเวลาที่กำหนด จึงค้นจากข้อมูลร้านแทน" : "Gemini took too long to respond, so the cafe catalogue was used.";
    if (reason === "provider_unavailable") return thai ? "บริการ Gemini ไม่พร้อมชั่วคราว จึงค้นจากข้อมูลร้านแทน" : "Gemini is temporarily unavailable, so the cafe catalogue was used.";
    return thai ? "Gemini ตอบกลับไม่สมบูรณ์ จึงค้นจากข้อมูลร้านแทน" : "Gemini did not return a usable answer, so the cafe catalogue was used.";
  }

  return (
    <div className="feature-page chat-page">
      <section className="chat-hero" aria-labelledby="chat-page-title">
        <div className="chat-hero-copy">
          <p className="chat-eyebrow">PHAYAOHOPPER <span aria-hidden="true">/</span> LOCAL CAFE GUIDE</p>
          <h1 id="chat-page-title">{thai ? <>หาร้านที่เข้ากับ<br /><span>จังหวะของคุณ</span></> : <>Find a cafe for<br /><span>your kind of day</span></>}</h1>
          <p className="chat-hero-description">
            {thai
              ? "บอกบรรยากาศหรือสิ่งที่กำลังมองหา แล้วเลือกคาเฟ่ในเมืองพะเยาที่เหมาะกับคุณ"
              : "Tell us the mood or amenities you have in mind. We’ll help you find a cafe in Mueang Phayao."}
          </p>
          <div className="chat-hero-meta">
            <span><Icon name="pin" width={16} height={16} />{thai ? "อำเภอเมืองพะเยา" : "Mueang Phayao"}</span>
            <span>{thai ? "อ้างอิงจากข้อมูลร้านในระบบ" : "Answers based on the cafe catalogue"}</span>
          </div>
        </div>
        <aside className="chat-hero-note" aria-label={thai ? "ขอบเขตการค้นหา" : "Search coverage"}>
          <span className="chat-hero-note-mark" aria-hidden="true"><Icon name="coffee" width={24} height={24} /></span>
          <p className="chat-hero-note-label">{thai ? "เริ่มจากสิ่งที่คุณชอบ" : "Start with what you like"}</p>
          <p>{thai ? "ร้านสงบ · อ่านหนังสือ · มีที่จอดรถ · หรือถามเวลาเปิด" : "Quiet spots · places to read · parking · or opening hours"}</p>
          <div className="chat-hero-note-count"><strong>{cafes.length}</strong><span>{thai ? "คาเฟ่ในคู่มือ" : "cafes in the guide"}</span></div>
        </aside>
      </section>

      {turns.length === 0 && (
        <div className="chat-mobile-prompts" role="group" aria-label={thai ? "คำถามตัวอย่าง" : "Example questions"}>
          {prompts.map((prompt) => (
            <button key={prompt} type="button" disabled={pending} onClick={() => void send(prompt)}>{prompt}<span aria-hidden="true">↗</span></button>
          ))}
        </div>
      )}

      <section className="chat-workspace" aria-label={thai ? "ผู้ช่วยค้นหาร้าน" : "Cafe assistant"}>
        <div className="chat-panel">
          <header className="chat-panel-head">
            <span className="chat-assistant-mark"><Icon name="coffee" width={20} height={20} /></span>
            <div className="chat-panel-heading">
              <strong>{thai ? "ผู้ช่วยค้นหาร้าน" : "Cafe assistant"}</strong>
              <span>{thai ? "ค้นหาคาเฟ่ในเมืองพะเยา" : "Find a cafe in Mueang Phayao"}</span>
            </div>
            <span className="chat-location-tag">{thai ? "พะเยา · เมือง" : "Phayao · Mueang"}</span>
            {turns.length > 0 && (
              <button
                type="button"
                className="chat-reset"
                disabled={pending}
                onClick={() => { setTurns([]); setQuery(""); setError(""); setFailed(""); }}
              >
                {thai ? "เริ่มใหม่" : "Start over"}
              </button>
            )}
          </header>

          <div ref={log} role="log" aria-live="polite" aria-label={thai ? "บทสนทนา" : "Conversation"} className="chat-history">
            {turns.length === 0 && (
              <div className="chat-empty-state">
                <span className="chat-empty-rule" aria-hidden="true" />
                <p className="chat-empty-kicker">{thai ? "เริ่มต้นบทสนทนา" : "A good place to begin"}</p>
                <h2>{thai ? "วันนี้อยากนั่งร้านแบบไหน?" : "What kind of place sounds good today?"}</h2>
                <p>{thai ? "เลือกคำถามตัวอย่าง หรือพิมพ์สิ่งที่อยากได้ด้วยภาษาของคุณเอง" : "Choose a prompt or describe what you’re looking for."}</p>
              </div>
            )}

            {turns.map((turn, index) => (
              <article key={`${index}-${turn.question}`} className="chat-turn">
                <p className="chat-user-message">{turn.question}</p>
                <div className="chat-answer">
                  <div className="chat-answer-source">
                    <span className="chat-answer-avatar"><Icon name="coffee" width={16} height={16} /></span>
                    <strong>{turn.reply.mode === "mock" ? (thai ? "โหมดจำลอง · ข้อมูลร้าน" : "Simulation · Cafe catalogue") : turn.reply.mode === "ai" ? (thai ? "Gemini · ข้อมูลร้านในระบบ" : "Gemini · Cafe catalogue") : (thai ? "ค้นจากข้อมูลร้าน" : "Cafe catalogue search")}</strong>
                    {turn.reply.mode !== "ai" && <span className="chat-source-note">{turn.reply.mode === "mock" ? (thai ? "โหมดทดสอบ" : "Test mode") : (thai ? "ระบบสำรอง" : "Fallback")}</span>}
                  </div>
                  {turn.reply.mode !== "ai" && <p className="chat-fallback-note">{fallbackDescription(turn.reply.fallbackReason)}</p>}
                  <p className="chat-answer-copy">{turn.reply.message}</p>
                  {turn.reply.cafes.length > 0 && (
                    <section className="chat-recommendations" aria-label={thai ? "คาเฟ่ที่แนะนำ" : "Recommended cafes"}>
                      <div className="chat-recommendations-heading">
                        <h3>{thai ? "ร้านที่น่าลอง" : "Places to explore"}</h3>
                        <span>{turn.reply.cafes.length} {thai ? "ร้าน" : turn.reply.cafes.length === 1 ? "cafe" : "cafes"}</span>
                      </div>
                      <div className="chat-recommendation-list">
                        {turn.reply.cafes.map((recommendation) => {
                          const cafe = cafes.find((item) => item.slug === recommendation.slug);
                          return (
                            <Link key={recommendation.slug} className="chat-recommendation" href={`/cafes/${recommendation.slug}`}>
                              <span className="chat-recommendation-photo">
                                {cafe
                                  ? <CafeThumb cafe={cafe} sizes="(max-width: 640px) 100vw, 220px" />
                                  : <span className="chat-recommendation-placeholder"><Icon name="coffee" width={24} height={24} /></span>}
                              </span>
                              <span className="chat-recommendation-body">
                                <strong>{cafe ? tr(cafe.name) : recommendation.name}</strong>
                                <span className="chat-recommendation-hours">{recommendation.openTime}–{recommendation.closeTime}</span>
                                <span className="chat-recommendation-address">{cafe ? tr(cafe.address) : recommendation.address}</span>
                                {cafe && <span className="chat-recommendation-description">{tr(cafe.description)}</span>}
                              </span>
                              <span className="chat-recommendation-arrow" aria-hidden="true">→</span>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              </article>
            ))}
            {pending && <p role="status" className="chat-pending"><span aria-hidden="true" />{thai ? "กำลังค้นหาร้านที่ตรงกับคุณ…" : "Looking for a cafe that fits…"}</p>}
          </div>

          <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(query); }}>
            <label className="sr-only" htmlFor="cafe-assistant-query">{thai ? "เล่าให้ฟังว่ากำลังมองหาร้านแบบไหน" : "Tell us what kind of cafe you’re looking for"}</label>
            <div className="chat-composer-row">
              <textarea
                ref={composerInput}
                id="cafe-assistant-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby="chat-composer-help"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send(query);
                  }
                }}
                rows={1}
                maxLength={500}
                required
                disabled={pending}
                placeholder={thai ? "เช่น อยากได้ร้านเงียบ ๆ มีปลั๊ก นั่งทำงานได้" : "e.g. A quiet cafe with outlets where I can work"}
              />
              <button
                type="submit"
                className="chat-send-button"
                aria-label={pending ? (thai ? "กำลังค้นหาร้าน" : "Searching") : (thai ? "ส่งข้อความ" : "Send message")}
                disabled={pending || !query.trim()}
              >
                {pending ? <span className="chat-send-loading" aria-hidden="true" /> : <span className="chat-send-arrow" aria-hidden="true">↑</span>}
              </button>
            </div>
            <div className="chat-composer-foot">
              <span id="chat-composer-help">{thai ? "Enter เพื่อส่ง · Shift + Enter ขึ้นบรรทัดใหม่" : "Enter to send · Shift + Enter for a new line"}</span>
              <span>{query.length}/500</span>
            </div>
            {error && (
              <div className="chat-error" role="alert">
                <span>{error}</span>
                <button type="button" className="chat-retry" disabled={pending} onClick={() => void send(failed)}>{thai ? "ลองอีกครั้ง" : "Retry"}</button>
              </div>
            )}
          </form>
        </div>

        <aside className="chat-sidebar">
          <section className="chat-quick-panel" aria-labelledby="chat-quick-title">
            <p className="chat-sidebar-kicker">{thai ? "ถามได้เลย" : "A few ideas"}</p>
            <h2 id="chat-quick-title">{thai ? "เริ่มจากคำถามเหล่านี้" : "Try asking"}</h2>
            <div className="chat-quick-list">
              {prompts.map((prompt, index) => (
                <button key={prompt} type="button" className="chat-quick-prompt" disabled={pending} onClick={() => void send(prompt)}>
                  <span>0{index + 1}</span><strong>{prompt}</strong><span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </section>
          <section className="chat-scope-note" aria-labelledby="chat-scope-title">
            <span className="chat-scope-mark" aria-hidden="true"><Icon name="pin" width={17} height={17} /></span>
            <h2 id="chat-scope-title">{thai ? "ค้นหาในพื้นที่เมืองพะเยา" : "Focused on Mueang Phayao"}</h2>
            <p>{thai ? "คำแนะนำและเวลาเปิด-ปิดอ้างอิงจากข้อมูลร้านที่มีในระบบ หากไม่มีข้อมูล ระบบจะแจ้งให้ทราบ" : "Recommendations and hours come from the available cafe catalogue. If a detail isn’t listed, we’ll say so."}</p>
          </section>
        </aside>
      </section>
    </div>
  );
}
