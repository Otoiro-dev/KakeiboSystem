"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Category, CategoryType } from "@/lib/types";

const EMOJIS = ["🛒", "🍽️", "🚃", "🏠", "💊", "👗", "🎮", "📚", "💰", "💼", "💸", "🎁", "💡", "📱", "✈️", "🏋️", "🐾"];
const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#64748b",
];

interface CategorySettingsProps {
  categories: Category[];
  userId: string;
}

export function CategorySettings({ categories, userId }: CategorySettingsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", type: "expense" as CategoryType, icon: "🛒", color: COLORS[0] });
  const [loading, setLoading] = useState(false);

  const userCategories = categories.filter((c) => c.user_id === userId);
  const defaultCategories = categories.filter((c) => c.user_id === null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "expense", icon: "🛒", color: COLORS[0] });
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setLoading(true);

    const payload = {
      name: form.name,
      type: form.type,
      icon: form.icon,
      color: form.color,
      user_id: userId,
      sort_order: 100,
    };

    if (editing) {
      await supabase.from("categories").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("categories").insert(payload);
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (cat: Category) => {
    await supabase.from("categories").delete().eq("id", cat.id);
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">カテゴリ管理</h2>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            追加
          </Button>
        </div>

        {/* ユーザーカテゴリ */}
        {userCategories.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">カスタム</p>
            {userCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span className="text-lg">{cat.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cat.name}</p>
                </div>
                <Badge
                  variant={cat.type === "income" ? "income" : cat.type === "expense" ? "expense" : "transfer"}
                >
                  {cat.type === "income" ? "収入" : cat.type === "expense" ? "支出" : "振替"}
                </Badge>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cat)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-4" />

        {/* デフォルトカテゴリ */}
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">デフォルト</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {defaultCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* フォームダイアログ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "カテゴリを編集" : "カテゴリを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>カテゴリ名</Label>
              <Input
                placeholder="例: カフェ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>種類</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as CategoryType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                  <SelectItem value="transfer">振替</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>アイコン</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`rounded-lg border p-1.5 text-lg transition-colors ${
                      form.icon === e ? "border-primary bg-primary/10" : "border-input hover:bg-accent"
                    }`}
                    onClick={() => setForm({ ...form, icon: e })}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>カラー</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
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
