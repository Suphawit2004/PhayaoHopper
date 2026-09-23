import SavedCafesView from "@/components/SavedCafesView";

export const metadata = { title: "ร้านโปรด — Favorite cafes", robots: { index: false, follow: false } };

export default function FavoriteCafesPage() { return <SavedCafesView list="favorite" />; }
