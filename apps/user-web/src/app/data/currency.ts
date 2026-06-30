import type { CountryOption, ExchangeRate } from "../types/domain";

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
