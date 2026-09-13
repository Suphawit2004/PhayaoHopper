"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
export default function ResultLink(props: ComponentProps<typeof Link>) {
 return <Link {...props} onClick={e => {props.onClick?.(e); if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; if (["/cafes","/map"].includes(window.location.pathname)) {try {sessionStorage.setItem("cafe-results-return",JSON.stringify({path:window.location.pathname+window.location.search,y:window.scrollY}));}catch{}}}} />;
}
