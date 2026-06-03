export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategorySettings } from "@/components/settings/category-settings";
import type { Category } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("sort_order");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>
      <CategorySettings
        categories={(categories ?? []) as Category[]}
        userId={user.id}
      />
    </div>
  );
}
