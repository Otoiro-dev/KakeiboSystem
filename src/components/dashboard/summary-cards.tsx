"use client";

import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Account, MonthlySummary } from "@/lib/types";

interface SummaryCardsProps {
  accounts: Account[];
  monthlySummary: MonthlySummary;
}

export function SummaryCards({ accounts, monthlySummary }: SummaryCardsProps) {
  const totalAssets = accounts
    .filter((a) => !a.is_archived && a.type !== "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = accounts
    .filter((a) => !a.is_archived && a.type === "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">総資産</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalAssets)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {accounts.filter((a) => !a.is_archived && a.type !== "credit_card").length}口座合計
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">当月収入</CardTitle>
          <TrendingUp className="h-4 w-4 text-income" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-income">
            {formatCurrency(monthlySummary.income)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">当月支出</CardTitle>
          <TrendingDown className="h-4 w-4 text-expense" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-expense">
            {formatCurrency(monthlySummary.expense)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">クレカ残高</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalDebt)}</div>
          <p className="text-xs text-muted-foreground mt-1">未払い合計</p>
        </CardContent>
      </Card>
    </div>
  );
}
