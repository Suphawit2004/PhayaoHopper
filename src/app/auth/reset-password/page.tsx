import { redirect } from "next/navigation";
import PasswordSettings from "@/components/PasswordSettings";
import UiText from "@/i18n/UiText";
import { getSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export const metadata = { title: "ตั้งรหัสผ่านใหม่ — Reset password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login?next=%2Fauth%2Freset-password");

  return (
    <div className="feature-page mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-3 text-2xl font-bold"><UiText text="ตั้งรหัสผ่านใหม่" en="Reset your password" /></h1>
      <p className="mb-6"><UiText text="ตั้งรหัสผ่านใหม่สำหรับบัญชี" en="Set a new password for" /> {user.email}</p>
      <PasswordSettings />
      <Link className="ui-secondary mt-4" href="/"><UiText text="กลับหน้าแรก" en="Back to home" /></Link>
    </div>
  );
}
