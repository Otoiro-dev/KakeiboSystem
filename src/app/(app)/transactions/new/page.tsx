export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Account, Category } from "@/lib/types";

export default async function NewTransactionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at"),
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("sort_order"),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">取引を追加</h1>
      <TransactionForm
        accounts={(accounts ?? []) as Account[]}
        categories={(categories ?? []) as Category[]}
        userId={user.id}
      />
    </div>
  );
}
