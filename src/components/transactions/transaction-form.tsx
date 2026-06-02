"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Account, Category, TransactionType } from "@/lib/types";

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  userId: string;
}

export function TransactionForm({ accounts, categories, userId }: TransactionFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === "transfer"
  );

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();

      if (data.total_amount) setAmount(String(data.total_amount));
      if (data.date) setDate(data.date);
      if (data.store_name) setMemo(data.store_name);
    } catch {
      // OCRに失敗しても無視
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    setLoading(true);
    setError(null);

    const amountNum = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("金額は正の数で入力してください");
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      user_id: userId,
      date,
      amount: amountNum,
      type,
      category_id: categoryId || null,
      account_id: accountId,
      to_account_id: type === "transfer" ? toAccountId || null : null,
      memo: memo || null,
    };

    const { error: insertError } = await supabase.from("transactions").insert(payload);

    if (insertError) {
      setError("取引の保存に失敗しました: " + insertError.message);
      setLoading(false);
      return;
    }

    // 残高更新
    await updateBalances(amountNum);

    router.push("/transactions");
    router.refresh();
  };

  const updateBalances = async (amountNum: number) => {
    if (type === "income") {
      await supabase.rpc("increment_balance", {
        p_account_id: accountId,
        p_amount: amountNum,
      });
    } else if (type === "expense") {
      await supabase.rpc("increment_balance", {
        p_account_id: accountId,
        p_amount: -amountNum,
      });
    } else if (type === "transfer" && toAccountId) {
      await Promise.all([
        supabase.rpc("increment_balance", {
          p_account_id: accountId,
          p_amount: -amountNum,
        }),
        supabase.rpc("increment_balance", {
          p_account_id: toAccountId,
          p_amount: amountNum,
        }),
      ]);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>取引を追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイプ選択 */}
          <div className="grid grid-cols-3 gap-2">
            {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? t === "income"
                      ? "border-income bg-income/10 text-income"
                      : t === "expense"
                      ? "border-expense bg-expense/10 text-expense"
                      : "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-accent"
                }`}
              >
                {t === "income" ? "収入" : t === "expense" ? "支出" : "振替"}
              </button>
            ))}
          </div>

          {/* OCRボタン */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleOcr}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
            >
              {ocrLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {ocrLoading ? "読み取り中..." : "レシートを読み取る"}
            </Button>
          </div>

          {/* 金額 */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">金額</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* 日付 */}
          <div className="space-y-1.5">
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* カテゴリ */}
          <div className="space-y-1.5">
            <Label>カテゴリ</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 口座 */}
          <div className="space-y-1.5">
            <Label>{type === "transfer" ? "送金元" : "口座"}</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger>
                <SelectValue placeholder="口座を選択" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 振替先 */}
          {type === "transfer" && (
            <div className="space-y-1.5">
              <Label>振替先</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="振替先を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* メモ */}
          <div className="space-y-1.5">
            <Label htmlFor="memo">メモ（任意）</Label>
            <Textarea
              id="memo"
              placeholder="メモを入力"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
