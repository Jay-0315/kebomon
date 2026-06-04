import { useMemo, useState } from "react";
import {
  Plus,
  Calendar,
  Tag,
  Users,
  Camera,
  X,
  Pencil,
  Trash2,
  Globe2,
  Share2,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import {
  formatCurrency,
  getCountryByCode,
  getExchangeRate,
  getCurrencySymbol,
} from "../data/currency";
import type { Expense, ExpenseDraft } from "../types/domain";
 
const categories = ["식비", "교통", "쇼핑", "카페", "문화생활", "의료", "기타"];

function toDraft(expense: Expense): ExpenseDraft {
  return {
    date: expense.date,
    category: expense.category,
    spentAmount: expense.spentAmount,
    spentCurrency: expense.spentCurrency,
    countryCode: expense.countryCode,
    memo: expense.memo,
    group: expense.group,
    participants: expense.participants,
    receipt: expense.receipt,
  };
}

export default function ExpensesPage() {
  const {
    expenses,
    countries,
    exchangeRates,
    profile,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useAppData();
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenseDraft>({
    date: new Date().toISOString().split("T")[0],
    category: "",
    spentAmount: 0,
    spentCurrency: profile.baseCurrency,
    countryCode: profile.baseCountryCode,
    memo: "",
    group: "",
    participants: 1,
    receipt: "",
  });

  const previewBaseAmount = useMemo(() => {
    return formData.spentAmount > 0
      ? formatCurrency(
          Math.round(
            formData.spentAmount *
              getExchangeRate(formData.spentCurrency, profile.baseCurrency, exchangeRates),
          ),
          profile.baseCurrency,
        )
      : formatCurrency(0, profile.baseCurrency);
  }, [exchangeRates, formData.spentAmount, formData.spentCurrency, profile.baseCurrency]);

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      category: "",
      spentAmount: 0,
      spentCurrency: profile.baseCurrency,
      countryCode: profile.baseCountryCode,
      memo: "",
      group: "",
      participants: 1,
      receipt: "",
    });
    setEditingExpenseId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.memo || formData.spentAmount <= 0) {
      return;
    }

    if (editingExpenseId) {
      updateExpense(editingExpenseId, formData);
    } else {
      createExpense(formData);
    }

    resetForm();
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData(toDraft(expense));
    setShowForm(true);
    setSelectedExpense(null);
  };

  const handleDelete = (expenseId: string) => {
    deleteExpense(expenseId);
    if (selectedExpense?.id === expenseId) {
      setSelectedExpense(null);
    }
  };

  const openCreateForm = () => {
    setEditingExpenseId(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2>지출 관리</h2>
          <p className="text-sm text-muted-foreground">
            메인 통화는 {profile.baseCurrency}이며, 내역 등록 시 환산 금액이 고정 저장됩니다.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : openCreateForm())}
          title={showForm ? "취소" : "지출 추가"}
          className="bg-primary/80 text-primary-foreground rounded-xl w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all shrink-0"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-5 shadow-lg border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  날짜
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  카테고리
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">선택</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {t(`cat.${category}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm flex items-center gap-1">
                  <Globe2 className="w-4 h-4" />
                  사용 국가
                </label>
                <select
                  value={formData.countryCode}
                  onChange={(e) => {
                    const country = getCountryByCode(e.target.value);
                    setFormData({
                      ...formData,
                      countryCode: country.code,
                      spentCurrency: country.currency,
                    });
                  }}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">결제 통화</label>
                <select
                  value={formData.spentCurrency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spentCurrency: e.target.value as ExpenseDraft["spentCurrency"],
                    })
                  }
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["KRW", "JPY"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm">
                사용 금액 ({getCurrencySymbol(formData.spentCurrency)} 기준)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.spentAmount || ""}
                onChange={(e) =>
                  setFormData({ ...formData, spentAmount: Number(e.target.value) || 0 })
                }
                placeholder="10000"
                className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <p className="text-xs text-muted-foreground mt-2">
                메인 통화 환산 미리보기: {previewBaseAmount}
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm">메모</label>
              <input
                type="text"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                placeholder="지출 내용"
                className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  그룹 (선택)
                </label>
                <input
                  type="text"
                  value={formData.group || ""}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  placeholder="친구들"
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm">인원 수</label>
                <input
                  type="number"
                  min="1"
                  value={formData.participants || 1}
                  onChange={(e) =>
                    setFormData({ ...formData, participants: Number(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm flex items-center gap-1">
                <Camera className="w-4 h-4" />
                영수증 이미지 URL (선택)
              </label>
              <input
                type="url"
                value={formData.receipt || ""}
                onChange={(e) => setFormData({ ...formData, receipt: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary/80 text-primary-foreground rounded-lg py-3 font-medium shadow-md hover:shadow-lg transition-all"
            >
              {editingExpenseId ? "수정하기" : "추가하기"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <h3 className="mb-4">지출 내역</h3>
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted hover:bg-accent/30 transition-colors"
            >
              <button
                onClick={() => setSelectedExpense(expense)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                    {t(`cat.${expense.category}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="bg-secondary/20 text-secondary-foreground text-xs px-2 py-1 rounded">
                    {getCountryByCode(expense.countryCode).flag} {expense.spentCurrency}
                  </span>
                  {expense.group && (
                    <span className="bg-accent/20 text-accent-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {expense.group}
                    </span>
                  )}
                  {expense.sharedToCommunity && (
                    <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      공유됨
                    </span>
                  )}
                </div>
                <p className="font-medium">{expense.memo}</p>
                <p className="text-sm text-muted-foreground">
                  {expense.date} · 사용금액 {formatCurrency(expense.spentAmount, expense.spentCurrency)}
                </p>
              </button>

              <div className="text-right">
                <p className="font-bold text-destructive">
                  {formatCurrency(expense.baseAmount, expense.baseCurrency)}
                </p>
                {expense.participants && expense.participants > 1 && (
                  <p className="text-xs text-muted-foreground">
                    1인당{" "}
                    {formatCurrency(
                      Math.round(expense.baseAmount / expense.participants),
                      expense.baseCurrency,
                    )}
                  </p>
                )}
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="p-2 rounded-md bg-card border border-border hover:bg-accent/20 transition-colors"
                    aria-label="edit-expense"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2 rounded-md bg-card border border-border hover:bg-destructive/10 text-destructive transition-colors"
                    aria-label="delete-expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedExpense && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3>지출 상세</h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedExpense.receipt && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img
                    src={selectedExpense.receipt}
                    alt="영수증"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">날짜</span>
                  <span className="font-medium">{selectedExpense.date}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">사용 국가</span>
                  <span className="font-medium">
                    {getCountryByCode(selectedExpense.countryCode).flag}{" "}
                    {getCountryByCode(selectedExpense.countryCode).name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">실사용 금액</span>
                  <span className="font-bold">
                    {formatCurrency(selectedExpense.spentAmount, selectedExpense.spentCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">메인국가 기준 금액</span>
                  <span className="font-bold text-destructive">
                    {formatCurrency(selectedExpense.baseAmount, selectedExpense.baseCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">적용 환율</span>
                  <span className="font-medium">
                    1 {selectedExpense.spentCurrency} = {selectedExpense.exchangeRate}{" "}
                    {selectedExpense.baseCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">내용</span>
                  <span className="font-medium">{selectedExpense.memo}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleEdit(selectedExpense)}
                  className="bg-primary/80 text-primary-foreground rounded-lg py-3 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(selectedExpense.id)}
                  className="bg-destructive/10 text-destructive rounded-lg py-3 font-medium hover:bg-destructive/20 transition-all"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
