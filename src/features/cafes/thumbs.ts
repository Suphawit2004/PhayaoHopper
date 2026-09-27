export const THUMB_COLORS: Array<[string, string]> = [
  ["#7c5a43", "#b98a5e"],
  ["#5c7457", "#93a97b"],
  ["#a06a3f", "#d9b382"],
  ["#6b4f6e", "#b48ead"],
  ["#3f6c72", "#83b0b5"],
  ["#8a5a44", "#c98d63"],
];

/** Single-color palette for map pins, derived from the thumb gradients. */
export const PIN_COLORS: string[] = THUMB_COLORS.map(([from]) => from);

export function gradientFor(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const [from, to] = THUMB_COLORS[hash % THUMB_COLORS.length];
  return `radial-gradient(circle at 22% 28%, rgb(255 255 255 / 0.18), transparent 42%), linear-gradient(135deg, ${from}, ${to})`;
}
