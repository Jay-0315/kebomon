import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Plus, X, TrendingUp, AlertCircle } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";
import type { CurrencyCode } from "../types/domain";
 
interface GroupMember {
  id: string;
  name: string;
  isHost: boolean;
}

interface Group {
  id: string;
  name: string;
  code: string;
  isPublic: boolean;
  codeExpiresAt: string | null;
  members: GroupMember[];
  isHost: boolean;
}

interface LocalExpense {
  id: string;
  date: string;
  category: string;
  spentAmount: number;
  spentCurrency: CurrencyCode;
  baseAmount: number;
  memo: string;
  participants?: number;
}

const CATEGORIES = ["식비", "교통", "카페", "쇼핑", "숙박", "엔터테인먼트", "기타"];
const CATEGORY_EMOJI: Record<string, string> = {
  식비: "🍜", 교통: "🚌", 카페: "☕", 쇼핑: "🛍", 숙박: "🏨", 엔터테인먼트: "🎭", 기타: "💳",
};

function formatAmount(expense: { spentAmount: number; spentCurrency: string; baseAmount: number }) {
  if (expense.spentCurrency === "JPY") {
    return `¥${expense.spentAmount.toLocaleString()} → ₩${expense.baseAmount.toLocaleString()}`;
  }
  return `₩${expense.spentAmount.toLocaleString()}`;
}

export default function GroupExpensesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createExpense } = useAppData();
  const { t } = useLang();

  const group: Group | undefined = location.state?.group;
  const initialLocal: LocalExpense[] = location.state?.localExpenses ?? [];

  const [localExpenses, setLocalExpenses] = useState<LocalExpense[]>(initialLocal);
  const [serverExpenses, setServerExpenses] = useState<LocalExpense[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showForm, setShowForm] = useState<boolean>(location.state?.openForm === true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "식비",
    spentAmount: "",
    spentCurrency: "JPY" as CurrencyCode,
    memo: "",
    participants: "",
  });

  useEffect(() => {
    if (!group) return;
    api.get<any[]>(`/groups/${group.id}/expenses`)
      .then((data) => setServerExpenses(data.map((e) => ({
        id: e.id,
        date: e.expenseDate?.slice(0, 10) ?? e.date ?? "",
        category: e.category,
        spentAmount: Number(e.spentAmount),
        spentCurrency: e.spentCurrency as CurrencyCode,
        baseAmount: Number(e.baseAmount),
        memo: e.memo,
        participants: e.participants ?? undefined,
      }))))
      .catch(console.error);
  }, [group?.id]);

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="mb-4">{t("expense.not_found")}</p>
        <button onClick={() => navigate("/groups")} className="bg-primary/80 text-primary-foreground rounded px-4 py-2 text-sm font-medium">
          {t("expense.back")}
        </button>
      </div>
    );
  }

  const allExpenses: LocalExpense[] = [...localExpenses, ...serverExpenses];

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.spentAmount || !form.memo.trim()) return;

    const amount = Number(form.spentAmount);

    setSubmitting(true);
    try {
      await createExpense({
        date: form.date,
        category: form.category,
        spentAmount: amount,
        spentCurrency: form.spentCurrency,
        countryCode: form.spentCurrency === "JPY" ? "JP" : "KR",
        memo: form.memo,
        group: group.name,
        groupId: group.id,
        participants: form.participants ? Number(form.participants) : undefined,
      });
      setLocalExpenses([]);
      setShowForm(false);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "식비", spentAmount: "", spentCurrency: "JPY", memo: "", participants: "" });
      api.get<any[]>(`/groups/${group.id}/expenses`)
        .then((data) => setServerExpenses(data.map((e) => ({
          id: e.id,
          date: e.expenseDate?.slice(0, 10) ?? e.date ?? "",
          category: e.category,
          spentAmount: Number(e.spentAmount),
          spentCurrency: e.spentCurrency as CurrencyCode,
          baseAmount: Number(e.baseAmount),
          memo: e.memo,
          participants: e.participants ?? undefined,
        }))))
        .catch(console.error);
    } catch {
      showToast("지출 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/40 bg-card shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-3 max-w-sm w-[90vw]">
          <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button onClick={() => setToast(null)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="truncate">{group.name} 지출 내역</h2>
          <p className="text-sm text-muted-foreground">{allExpenses.length}{t("expense.count_suffix")}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`w-10 h-10 flex items-center justify-center rounded-md transition-all shrink-0 ${
            showForm ? "bg-muted text-muted-foreground" : "bg-primary/80 text-primary-foreground hover:shadow-md"
          }`}
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-md border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("expense.date")}</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("expense.category")}</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}` as Parameters<typeof t>[0])}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("expense.amount")}</label>
              <input
                type="number"
                value={form.spentAmount}
                onChange={(e) => setForm({ ...form, spentAmount: e.target.value })}
                placeholder="0"
                min="0"
                required
                className="w-full px-3 py-2 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("expense.currency")}</label>
              <select
                value={form.spentCurrency}
                onChange={(e) => setForm({ ...form, spentCurrency: e.target.value as CurrencyCode })}
                className="w-full px-3 py-2 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="JPY">¥ JPY (엔)</option>
                <option value="KRW">₩ KRW (원)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("expense.memo")}</label>
            <input
              type="text"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder={t("expense.memo_placeholder")}
              required
              className="w-full px-3 py-2 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("expense.participants")}</label>
            <input
              type="number"
              value={form.participants}
              placeholder={t("expense.participants_placeholder")}
              min="1"
              max={group.members.length}
              onChange={(e) => {
                const val = Math.min(Number(e.target.value), group.members.length);
                setForm({ ...form, participants: val > 0 ? String(val) : "" });
              }}
              className="w-full px-3 py-2 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary/80 text-primary-foreground rounded py-2.5 text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? t("expense.saving") : t("expense.add")}
          </button>
        </form>
      )}

      {/* Expense list */}
      {allExpenses.length === 0 ? (
        <div className="bg-card rounded-md border border-border p-10 text-center text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("expense.no_expenses")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center gap-3 p-4 rounded-md bg-card border border-border">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-lg shrink-0">
                {CATEGORY_EMOJI[expense.category] ?? "💳"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{expense.memo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {expense.date} · {t(`cat.${expense.category}` as Parameters<typeof t>[0])}
                  {expense.participants ? ` · ${expense.participants}명` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-primary leading-tight">
                  {formatAmount(expense)}
                </p>
                {expense.participants && expense.participants > 1 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    1인 ₩{Math.round(expense.baseAmount / expense.participants).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
