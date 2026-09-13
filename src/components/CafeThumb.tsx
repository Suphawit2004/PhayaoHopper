"use client";

import { useState } from "react";
import Image from "next/image";
import type { Cafe } from "@/data/cafes";
import { gradientFor } from "@/lib/thumbs";
import { useLang } from "@/i18n/LangProvider";
import photoCredits from "@/data/photo-credits.json";

interface CafeThumbProps {
  cafe: Cafe;
  emojiClassName?: string;
  sizes?: string;
  preload?: boolean;
}

export default function CafeThumb({
  cafe,
  preload = false,
  emojiClassName = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
}: CafeThumbProps) {
  const { tr } = useLang();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  if (!cafe.photo || failedPhoto === cafe.photo) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: gradientFor(cafe.slug) }}
        aria-hidden
      >
        <span className={emojiClassName}>☕</span>
      </div>
    );
  }
  return (
    <Image
      src={cafe.slug in photoCredits && cafe.photo === `/images/cafes/${cafe.slug}/main.jpg` ? `${cafe.photo}?v=20260910-real` : cafe.photo}
      onError={() => setFailedPhoto(cafe.photo ?? null)}
      alt={tr(cafe.name)}
      preload={preload}
      fill
      sizes={sizes}
      className="object-cover"
    />
  );
}
