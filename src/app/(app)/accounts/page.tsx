export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountList } from "@/components/accounts/account-list";
import type { Account } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">口座管理</h1>
      <AccountList accounts={(accounts ?? []) as Account[]} userId={user.id} />
    </div>
  );
}
