export type AccountType = "cash" | "bank" | "credit_card";
export type TransactionType = "income" | "expense" | "transfer";
export type CategoryType = "income" | "expense" | "transfer";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  credit_limit: number | null;
  color: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  memo: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
  to_account?: Account;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
}

export interface OcrResult {
  store_name?: string;
  date?: string;
  total_amount?: number;
  items?: { name: string; price: number }[];
}
