import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { MyPhotos } from "@/components/CafeCommunity";

export const metadata = {
  title: "รูปของฉัน — My photos",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const supabase = await getSupabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/login?next=/photos");

  return <div className="feature-page"><MyPhotos headingLevel={1} /></div>;
}
