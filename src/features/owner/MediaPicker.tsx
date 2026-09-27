"use client";
import {useEffect,useRef,useState} from "react";
import {useLang} from "@/i18n/LangProvider";
export default function MediaPicker({label,initialUrl}:{label:string;initialUrl?:string|null}){
 const {lang}=useLang();const [preview,setPreview]=useState("");const [error,setError]=useState("");const input=useRef<HTMLInputElement>(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 useEffect(()=>{const form=input.current?.form;if(!form)return;const clear=()=>{setPreview("");setError("");};form.addEventListener("reset",clear);return()=>form.removeEventListener("reset",clear);},[]);
 return <div><label>{label}<small>{lang==="th"?"JPG, PNG หรือ WebP ไม่เกิน 5 MB":"JPG, PNG or WebP, up to 5 MB"}</small><input ref={input} name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];setError("");setPreview("");if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){e.target.value="";setError(lang==="th"?"ตรวจชนิดและขนาดไฟล์อีกครั้ง":"Check the file type and size");return;}setPreview(URL.createObjectURL(file));}}/></label>
 {(preview||initialUrl)&&<div className="mt-3"><p>{preview?(lang==="th"?"ภาพใหม่ก่อนบันทึก":"New image preview"):(lang==="th"?"ภาพปัจจุบัน":"Current image")}</p>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={preview||initialUrl!} alt={label} className="max-h-48 max-w-full rounded-xl object-contain" /></div>}
 {preview&&<button type="button" className="ui-secondary mt-2" onClick={()=>{setPreview("");if(input.current)input.current.value="";}}>{lang==="th"?"นำรูปใหม่ออก":"Remove new image"}</button>}<p role="status">{error}</p></div>;
}
