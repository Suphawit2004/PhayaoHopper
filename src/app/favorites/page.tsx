import SavedCafesView from "@/components/SavedCafesView";

export const metadata = {
  title: "ร้านที่อยากไป — Want to visit",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <SavedCafesView list="wanted" />;
}
