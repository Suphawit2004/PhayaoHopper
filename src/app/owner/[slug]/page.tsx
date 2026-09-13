
import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { cafeFromRow } from "@/lib/cafe-row";




import CafeEditorView from "@/components/CafeEditorView";

export default async function CafeEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await getSupabaseServer();
  if (!sb) redirect("/owner");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=/owner/${slug}`);
  const { data: admin } = await sb.rpc("is_admin");
  const { data: owner } = await sb.from("cafe_owners").select("user_id").eq("cafe_slug", slug).maybeSingle();
  if (!admin && owner?.user_id !== user.id) notFound();
  const { data: row } = await sb.from("cafes").select("*").eq("slug", slug).maybeSingle();
  if (!row) notFound();
  const cafe = cafeFromRow(row);
  const { data: menu, error } = await sb.from("menu_items").select("id,name:name_th,nameEn:name_en,price,available:is_available,photo_url").eq("cafe_slug", slug).order("created_at");
  return <CafeEditorView cafe={cafe} admin={admin===true} isActive={row.is_active} menu={menu??[]} error={!!error} ownerId={owner?.user_id??""}/>;
}
