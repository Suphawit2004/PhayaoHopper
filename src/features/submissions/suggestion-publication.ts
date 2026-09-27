/** Undefined means the catalogue failed to load; null means no published row. */
export function suggestionPublication(id: string, cafes: { slug: string }[] | null): string | null | undefined {
  if (cafes === null) return undefined;
  const slug = `cafe-${id}`;
  return cafes.some(cafe => cafe.slug === slug) ? slug : null;
}
