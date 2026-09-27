import SavedCafesView from "@/features/saved-cafes/SavedCafesView";

export const metadata = { title: "ร้านที่เคยไป — Visited cafes", robots: { index: false, follow: false } };

export default function VisitedPage() { return <SavedCafesView list="visited" />; }
