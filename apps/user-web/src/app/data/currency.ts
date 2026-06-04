import type { CountryOption, CurrencyCode, ExchangeRate } from "../types/domain";

export const countries: CountryOption[] = [
  { code: "KR", name: "대한민국", currency: "KRW", flag: "🇰🇷" },
  { code: "JP", name: "일본", currency: "JPY", flag: "🇯🇵" },
];

export const exchangeRates: ExchangeRate[] = [
  { from: "KRW", to: "KRW", rate: 1, updatedAt: "2026-05-15" },
  { from: "JPY", to: "JPY", rate: 1, updatedAt: "2026-05-15" },
  { from: "JPY", to: "KRW", rate: 9.1, updatedAt: "2026-05-15" },
  { from: "KRW", to: "JPY", rate: 0.11, updatedAt: "2026-05-15" },
];

export function getCountryByCode(code: string) {
  return countries.find((country) => country.code === code) ?? countries[0];
}

export function getCurrencySymbol(currency: CurrencyCode) {
  switch (currency) {
    case "KRW":
      return "₩";
    case "JPY":
      return "¥";
  }
}

export function getExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRate[],
) {
  const rate = rates.find((item) => item.from === from && item.to === to);
  return rate?.rate ?? 1;
}

export function formatCurrency(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
