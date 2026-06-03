export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { getCurrentYearMonth, getYearMonthRange, formatYearMonth } from "@/lib/utils";
import type { Account, Transaction, CategorySummary } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const yearMonth = getCurrentYearMonth();
  const { start, end } = getYearMonthRange(yearMonth);

  const [
    { data: accounts },
    { data: transactions },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at"),
    supabase
      .from("transactions")
      .select("*, category:categories(*), account:accounts!account_id(*)")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("transactions")
      .select("*, category:categories(*), account:accounts!account_id(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const income = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const monthlySummary = { income, expense, balance: income - expense };

  // カテゴリ別支出集計
  const expenseByCategory = (transactions ?? [])
    .filter((t) => t.type === "expense" && t.category)
    .reduce<Record<string, CategorySummary>>((acc, t) => {
      const cat = t.category!;
      if (!acc[cat.id]) {
        acc[cat.id] = {
          category_id: cat.id,
          category_name: cat.name,
          category_color: cat.color,
          category_icon: cat.icon,
          total: 0,
        };
      }
      acc[cat.id].total += t.amount;
      return acc;
    }, {});
  const categoryData = Object.values(expenseByCategory).sort((a, b) => b.total - a.total);

  // 直近6ヶ月データ
  const now = new Date();
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const { start: s, end: e } = getYearMonthRange(ym);
      return supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user.id)
        .gte("date", s)
        .lte("date", e)
        .then(({ data }) => ({
          month: `${d.getMonth() + 1}月`,
          income: (data ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
          expense: (data ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
        }));
    })
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">{formatYearMonth(new Date())}</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4" />
            取引を追加
          </Link>
        </Button>
      </div>

      <SummaryCards
        accounts={(accounts ?? []) as Account[]}
        monthlySummary={monthlySummary}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseChart data={categoryData} />
        <MonthlyChart data={monthlyData} />
      </div>

      <RecentTransactions transactions={(recentTransactions ?? []) as Transaction[]} />
    </div>
  );
}
