import CafesExplorer from "@/features/discovery/CafesExplorer";

export const metadata = {
  title: "คาเฟ่ในเมืองพะเยา — Cafes in Phayao",
  description:
    "รวมคาเฟ่ทั้งหมดในเมืองพะเยา กรองตามพื้นที่ แท็ก ไลฟ์สไตล์ ราคา และสถานะเปิด-ปิด พร้อมพิกัดและเวลาเปิด Browse all cafes in Phayao with filters for area, mood, lifestyle, price and opening hours.",
};

export default function CafesPage() {
  return <CafesExplorer />;
}