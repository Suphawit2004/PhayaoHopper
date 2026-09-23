"use client";
import {useUi} from "@/i18n/UiText";
import {useLang} from "@/i18n/LangProvider";
import Link from "next/link";
import type {Cafe} from "@/data/cafes";
import { TAG_META, LIFESTYLE_META, AREA_META, type CafeTag, type LifeStyleTag } from "@/data/cafes";
import {saveCafe} from "@/app/actions/cafe-management";
import ActionForm from "./ActionForm";
import CafeCommunity from "./CafeCommunity";
import MediaPicker from "./MediaPicker";
import MenuManager,{type EditableMenu} from "./MenuManager";
import OwnerAssignment from "./OwnerAssignment";
import MapBlock from "./map/MapBlock";
import { CAFE_COORDINATE_BOUNDS } from "@/lib/cafe-coordinates";
export default function CafeEditorView({cafe,admin,isActive,menu,error,ownerId,embedded=false}:{cafe:Cafe;admin:boolean;isActive:boolean;menu:EditableMenu[];error:boolean;ownerId:string;embedded?:boolean}){
  const ui=useUi();
 const {tr}=useLang();
  const slug=cafe.slug;
  const customStyles=cafe.tags.filter(tag=>!(tag in TAG_META));
  const customFacilities=cafe.lifestyleTags.filter(tag=>!(tag in LIFESTYLE_META));
return <div className={embedded ? "admin-embedded-editor" : "feature-page"}><Link href={embedded ? "/admin?tab=cafes" : admin ? "/admin" : "/owner"}>{ui("← กลับหน้าจัดการ")}</Link><h1 className="mt-4">{tr(cafe.name)}</h1><Link href={`/cafes/${slug}`}>{ui("ดูหน้าร้าน →")}</Link>
    <section className="feature-card"><h2>{ui("ข้อมูลร้าน")}</h2><ActionForm action={saveCafe}>
      <input type="hidden" name="slug" value={slug} />
      {admin && <label><span><input type="checkbox" name="isActive" defaultChecked={isActive} />{ui("เผยแพร่ร้านในเว็บไซต์ (ปิดเมื่อร้านเลิกกิจการ)")}</span></label>}
      <details open><summary className="font-semibold">{ui("ข้อมูลหลักและภาษา")}</summary><div className="feature-grid mt-4">
        <label>{ui("ชื่อร้าน")}<input name="name" defaultValue={cafe.name.th} required maxLength={160} /></label>
        <label>{ui("ชื่อภาษาอังกฤษ")}<input name="nameEn" defaultValue={cafe.name.en} maxLength={160} /></label>
        <label>{ui("รายละเอียด")}<textarea name="description" defaultValue={cafe.description.th} maxLength={2000} rows={4} /></label>
        <label>{ui("รายละเอียดภาษาอังกฤษ")}<textarea name="descriptionEn" defaultValue={cafe.description.en} maxLength={2000} rows={4} /></label>
      </div></details><details open><summary className="font-semibold">{ui("ที่ตั้งและการติดต่อ")}</summary><div className="feature-grid mt-4">
        <label>{ui("ที่อยู่")}<input name="address" defaultValue={cafe.address.th} maxLength={500} /></label>
        <label>{ui("ที่อยู่ภาษาอังกฤษ")}<input name="addressEn" defaultValue={cafe.address.en} maxLength={500} /></label>
        <label>{ui("โทรศัพท์")}<input name="phone" defaultValue={cafe.phone} maxLength={40} /></label>
        <MediaPicker label={ui("รูปหน้าร้าน")} initialUrl={cafe.photo}/>
      </div></details><details open><summary className="font-semibold">{ui("เวลาเปิด ราคา และพื้นที่")}</summary><div className="feature-grid mt-4">
        <label>{ui("เวลาเปิด")}<input type="time" name="openTime" defaultValue={cafe.openTime} required /></label>
        <label>{ui("เวลาปิด")}<input type="time" name="closeTime" defaultValue={cafe.closeTime} required /></label>
        <label>{ui("ละติจูด")}<input type="number" step="any" name="lat" defaultValue={cafe.lat} readOnly={!admin} required min={CAFE_COORDINATE_BOUNDS.minLat} max={CAFE_COORDINATE_BOUNDS.maxLat} /></label>
        <label>{ui("ลองจิจูด")}<input type="number" step="any" name="lng" defaultValue={cafe.lng} readOnly={!admin} required min={CAFE_COORDINATE_BOUNDS.minLng} max={CAFE_COORDINATE_BOUNDS.maxLng} /></label>
        <label>{ui("พื้นที่")}<select name="area" defaultValue={cafe.area} disabled={!admin}>{Object.entries(AREA_META).map(([key, value]) => <option value={key} key={key}>{tr(value.label)}</option>)}</select></label>
        <label>{ui("ระดับราคา")}<select name="priceRange" defaultValue={cafe.priceRange}><option value="1">฿</option><option value="2">฿฿</option></select></label>
      </div></details>
      <MapBlock cafes={[cafe]} className="h-56"/>
      {!admin && <p>{ui("หากพิกัดหรือพื้นที่ไม่ถูกต้อง กรุณาแจ้งแก้ไขผ่านหน้าร้าน")}</p>}
      <fieldset><legend>{ui("วันหยุดประจำ")}</legend><div className="flex flex-wrap gap-4 mt-2">{[ui("อาทิตย์"),ui("จันทร์"),ui("อังคาร"),ui("พุธ"),ui("พฤหัสบดี"),ui("ศุกร์"),ui("เสาร์")].map((day, i) => <label key={day}><span><input name="closedDays" type="checkbox" value={i} defaultChecked={cafe.closedDays.includes(i)} /> {day}</span></label>)}</div></fieldset>
      <fieldset className="cafe-tag-fieldset"><legend>{ui("สไตล์ร้าน")}</legend><div className="cafe-tag-picker">{Object.entries(TAG_META).map(([key, value]) => <label className="cafe-tag-chip" key={key}><input name="tags" type="checkbox" value={key} defaultChecked={cafe.tags.includes(key as CafeTag)} /><span>{tr(value.label)}</span></label>)}{customStyles.map(tag=><label className="cafe-tag-chip" key={tag}><input name="tags" type="checkbox" value={tag} defaultChecked /><span>{tag}</span></label>)}</div><label className="cafe-tag-add">{ui("เพิ่มสไตล์อื่น (คั่นแต่ละรายการด้วยจุลภาคหรือขึ้นบรรทัดใหม่)")}<input name="newTags" maxLength={500} placeholder={ui("เช่น มีดนตรีสด, สวนริมน้ำ")} /></label></fieldset>
      <fieldset className="cafe-tag-fieldset"><legend>{ui("สิ่งอำนวยความสะดวก")}</legend><div className="cafe-tag-picker">{Object.entries(LIFESTYLE_META).map(([key, value]) => <label className="cafe-tag-chip" key={key}><input name="lifestyleTags" type="checkbox" value={key} defaultChecked={cafe.lifestyleTags.includes(key as LifeStyleTag)} /><span>{tr(value.label)}</span></label>)}{customFacilities.map(tag=><label className="cafe-tag-chip" key={tag}><input name="lifestyleTags" type="checkbox" value={tag} defaultChecked /><span>{tag}</span></label>)}</div><label className="cafe-tag-add">{ui("เพิ่มสิ่งอำนวยความสะดวกอื่น (คั่นแต่ละรายการด้วยจุลภาคหรือขึ้นบรรทัดใหม่)")}<input name="newLifestyleTags" maxLength={500} placeholder={ui("เช่น มีปลั๊กไฟ, รับชำระด้วยบัตร")} /></label></fieldset>
    </ActionForm></section>
    {error && <p role="alert">{ui("โหลดเมนูไม่สำเร็จ กรุณาลองใหม่")}</p>}
    <MenuManager slug={slug} items={menu} />
    <CafeCommunity slug={slug} admin={admin === true} />
    {admin && <OwnerAssignment slug={slug} currentId={ownerId} />}
  </div>;
}
