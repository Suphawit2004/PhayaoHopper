interface RatingStarsProps {
  value: number;
  size?: "sm" | "md";
}

export default function RatingStars({ value, size = "sm" }: RatingStarsProps) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const textSize = size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`relative inline-block whitespace-nowrap ${textSize} leading-none`} role="img" aria-label={`${value.toFixed(1)} / 5`}>
      <span className="text-[#d9cdb8]">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden text-latte"
        style={{ width: `${pct}%` }}
        aria-hidden
      >
        ★★★★★
      </span>
    </span>
  );
}
