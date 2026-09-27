function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Tolerant name matching: exact substring > whole-word prefix > subsequence.
 * Returns a relevance score (higher = better) or null when there is no match.
 */
export function fuzzyMatch(text: string, query: string): number | null {
  const h = norm(text);
  const n = norm(query);
  if (!n) return null;

  const idx = h.indexOf(n);
  if (idx >= 0) return 100 - Math.min(idx, 20);

  // Every query token is a prefix of some token in the text ("บ้านบาน" ~ "บ้านบานน์ ริมกว๊าน")
  const hayTokens = h.split(" ");
  const queryTokens = n.split(" ");
  if (queryTokens.length > 0 && queryTokens.every((qt) => hayTokens.some((wt) => wt.startsWith(qt)))) {
    return 80;
  }

  // Characters appear in order ("สิปปิน" ~ "sippin"), only for meaningful queries
  if (n.length >= 3) {
    let i = 0;
    for (const ch of h) {
      if (ch === n[i]) i += 1;
      if (i === n.length) return 55;
    }
  }

  if (n.length >= 4 && n.length <= 80 && hayTokens.some(word => editDistance(word, n) <= 1)) return 45;
  return null;
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
