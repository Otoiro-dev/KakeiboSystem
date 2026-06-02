export const dynamic = "force-dynamic";

import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, getCurrentYearMonth, getYearMonthRange } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

const typeConfig = {
  income: {
    icon: ArrowDownLeft,
    label: "収入",
    variant: "income" as const,
    colorClass: "text-income",
    sign: "+",
  },
  expense: {
    icon: ArrowUpRight,
    label: "支出",
    variant: "expense" as const,
    colorClass: "text-expense",
    sign: "-",
  },
  transfer: {
    icon: ArrowLeftRight,
    label: "振替",
    variant: "transfer" as const,
    colorClass: "text-muted-foreground",
    sign: "",
  },
};

export default async function TransactionsPage({
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
    .select("*, category:categories(*), account:accounts!account_id(*)")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const txList = (transactions ?? []) as Transaction[];
  const income = txList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // 月選択用の直近12ヶ月
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { ym, label: `${d.getFullYear()}年${d.getMonth() + 1}月` };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">取引一覧</h1>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4" />
            追加
          </Link>
        </Button>
      </div>

      {/* 月選択 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {months.map(({ ym, label }) => (
          <Link
            key={ym}
            href={`/transactions?month=${ym}`}
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

      {/* 月次サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">収入</p>
          <p className="text-lg font-bold text-income">{formatCurrency(income)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">支出</p>
          <p className="text-lg font-bold text-expense">{formatCurrency(expense)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">収支</p>
          <p
            className={cn(
              "text-lg font-bold",
              income - expense >= 0 ? "text-income" : "text-expense"
            )}
          >
            {formatCurrency(income - expense)}
          </p>
        </div>
      </div>

      {/* 取引リスト */}
      <Card>
        <CardContent className="p-0">
          {txList.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              この月の取引がありません
            </p>
          ) : (
            <ul className="divide-y">
              {txList.map((tx) => {
                const config = typeConfig[tx.type];
                const Icon = config.icon;
                return (
                  <li key={tx.id} className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.category?.name ?? "未分類"}
                        {tx.memo && (
                          <span className="ml-1 text-muted-foreground font-normal">
                            · {tx.memo}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date)} · {tx.account?.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-semibold", config.colorClass)}>
                        {config.sign}{formatCurrency(tx.amount)}
                      </p>
                      <Badge variant={config.variant} className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
