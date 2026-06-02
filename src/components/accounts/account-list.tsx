"use client";

import { useState } from "react";
import { Plus, Pencil, Archive, CreditCard, Banknote, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Account, AccountType } from "@/lib/types";

const accountTypeConfig = {
  cash: { label: "現金", icon: Banknote, color: "#10b981" },
  bank: { label: "銀行口座", icon: Wallet, color: "#6366f1" },
  credit_card: { label: "クレジットカード", icon: CreditCard, color: "#f59e0b" },
};

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#64748b",
];

interface AccountListProps {
  accounts: Account[];
  userId: string;
}

interface AccountFormState {
  name: string;
  type: AccountType;
  balance: string;
  credit_limit: string;
  color: string;
}

const defaultForm: AccountFormState = {
  name: "",
  type: "bank",
  balance: "0",
  credit_limit: "",
  color: COLORS[0],
};

export function AccountList({ accounts, userId }: AccountListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormState>(defaultForm);
  const [loading, setLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      balance: String(account.balance),
      credit_limit: account.credit_limit ? String(account.credit_limit) : "",
      color: account.color,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setLoading(true);

    const payload = {
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
      color: form.color,
      icon: "",
      user_id: userId,
    };

    if (editing) {
      await supabase.from("accounts").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("accounts").insert(payload);
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  const handleArchive = async (account: Account) => {
    await supabase
      .from("accounts")
      .update({ is_archived: !account.is_archived })
      .eq("id", account.id);
    router.refresh();
  };

  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);

  return (
    <div className="space-y-6">
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4" />
        口座を追加
      </Button>

      {/* アクティブ口座 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((account) => {
          const config = accountTypeConfig[account.type];
          const Icon = config.icon;
          return (
            <Card key={account.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: account.color + "20", color: account.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{account.name}</p>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(account)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => handleArchive(account)}
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    account.type === "credit_card" && account.balance > 0 && "text-expense"
                  )}
                >
                  {formatCurrency(account.balance)}
                </p>
                {account.type === "credit_card" && account.credit_limit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    限度額: {formatCurrency(account.credit_limit)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* アーカイブ済み */}
      {archived.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">アーカイブ済み</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((account) => {
              const config = accountTypeConfig[account.type];
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 opacity-60"
                >
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleArchive(account)}
                  >
                    復元
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 口座フォームダイアログ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "口座を編集" : "口座を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>口座名</Label>
              <Input
                placeholder="例: 三菱UFJ銀行"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>種類</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as AccountType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">銀行口座</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="credit_card">クレジットカード</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{form.type === "credit_card" ? "現在の未払い残高" : "残高"}</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
              />
            </div>
            {form.type === "credit_card" && (
              <div className="space-y-1.5">
                <Label>利用限度額（任意）</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.credit_limit}
                  onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>カラー</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
