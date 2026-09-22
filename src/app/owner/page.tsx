import { getSupabaseServer } from "@/lib/supabase-server";
import { getCatalog } from "@/lib/catalog";
import OwnerPortalView from "@/components/OwnerPortalView";

export default async function OwnerPage() {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!user || !sb) {
    return <OwnerPortalView user={null} cafes={[]} error={false} />;
  }
  const { data: owners, error } = await sb.from("cafe_owners").select("cafe_slug").eq("user_id", user.id);
  const { data: admin } = await sb.rpc("is_admin");
  const cafes = (await getCatalog()).filter((c) => admin || owners?.some((o) => o.cafe_slug === c.slug));
  return <OwnerPortalView user={{ id: user.id }} cafes={cafes} error={Boolean(error)} />;
}
