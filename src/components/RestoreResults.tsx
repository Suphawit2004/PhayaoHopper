"use client";
import { useEffect } from "react";
export default function RestoreResults({ ready }: { ready: boolean }) {useEffect(()=>{if(!ready)return;let frame=0;try{if(sessionStorage.getItem("cafe-results-restore")==="1"){const saved=JSON.parse(sessionStorage.getItem("cafe-results-return")||"null");if(saved?.path===window.location.pathname+window.location.search){sessionStorage.removeItem("cafe-results-restore");frame=requestAnimationFrame(()=>window.scrollTo(0,Number(saved.y)||0));}}}catch{}return()=>cancelAnimationFrame(frame);},[ready]);return null;}
