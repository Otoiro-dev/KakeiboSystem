export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, getCurrentYearMonth, getYearMonthRange, formatYearMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import Link from "next/link";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { month } = await searchParams;
  const yearMonth = month ?? getCurrentYearMonth();
  const { start, end } = getYearMonthRange(yearMonth);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  const txList = transactions ?? [];
  const income = txList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const expenseByCategory = txList
    .filter((t) => t.type === "expense" && t.category)
    .reduce<Record<string, { name: string; color: string; total: number }>>((acc, t) => {
      const cat = t.category!;
      if (!acc[cat.id]) acc[cat.id] = { name: cat.name, color: cat.color, total: 0 };
      acc[cat.id].total += t.amount;
      return acc;
    }, {});

  const incomeByCategory = txList
    .filter((t) => t.type === "income" && t.category)
    .reduce<Record<string, { name: string; color: string; total: number }>>((acc, t) => {
      const cat = t.category!;
      if (!acc[cat.id]) acc[cat.id] = { name: cat.name, color: cat.color, total: 0 };
      acc[cat.id].total += t.amount;
      return acc;
    }, {});

  // 直近6ヶ月
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

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { ym, label: `${d.getFullYear()}年${d.getMonth() + 1}月` };
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">月次レポート</h1>

      {/* 月選択 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {months.map(({ ym, label }) => (
          <Link
            key={ym}
            href={`/reports?month=${ym}`}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ym === yearMonth
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input text-muted-foreground hover:bg-accent"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-4">
          {formatYearMonth(new Date(`${yearMonth}-01`))}
        </p>

        {/* サマリー */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">収入</p>
              <p className="text-xl font-bold text-income">{formatCurrency(income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">支出</p>
              <p className="text-xl font-bold text-expense">{formatCurrency(expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">収支</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  income - expense >= 0 ? "text-income" : "text-expense"
                )}
              >
                {formatCurrency(income - expense)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 支出カテゴリ */}
          <Card>
            <CardHeader>
              <CardTitle>支出内訳</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(expenseByCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">データなし</p>
              ) : (
                <ul className="space-y-3">
                  {Object.entries(expenseByCategory)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([id, data]) => (
                      <li key={id} className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: data.color || "#6366f1" }}
                        />
                        <span className="text-sm flex-1">{data.name}</span>
                        <span className="text-sm font-semibold text-expense">
                          {formatCurrency(data.total)}
                        </span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {expense > 0 ? Math.round((data.total / expense) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 収入カテゴリ */}
          <Card>
            <CardHeader>
              <CardTitle>収入内訳</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(incomeByCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">データなし</p>
              ) : (
                <ul className="space-y-3">
                  {Object.entries(incomeByCategory)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([id, data]) => (
                      <li key={id} className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: data.color || "#10b981" }}
                        />
                        <span className="text-sm flex-1">{data.name}</span>
                        <span className="text-sm font-semibold text-income">
                          {formatCurrency(data.total)}
                        </span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {income > 0 ? Math.round((data.total / income) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <MonthlyChart data={monthlyData} />
    </div>
  );
}
