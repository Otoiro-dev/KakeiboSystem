"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

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

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>最近の取引</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">すべて見る</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            取引がありません
          </p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((tx) => {
              const config = typeConfig[tx.type];
              const Icon = config.icon;
              return (
                <li key={tx.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.category?.name ?? "未分類"}
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
  );
}
