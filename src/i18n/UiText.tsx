"use client";
import {useCallback} from "react";
import {useLang} from "./LangProvider";
import {translateUi} from "./ui-translations";
export function useUi(){const {lang}=useLang();return useCallback((text:string)=>translateUi(text,lang),[lang]);}
export default function UiText({text,en}:{text:string;en?:string}){const {lang}=useLang();return <>{lang==="en"&&en?en:translateUi(text,lang)}</>;}
