import type { CountryOption } from "../types/domain";

export const countries: CountryOption[] = [
  { code: "KR", name: "대한민국", currency: "KRW", flag: "🇰🇷" },
  { code: "JP", name: "일본", currency: "JPY", flag: "🇯🇵" },
];

export function getCountryByCode(code: string) {
  return countries.find((country) => country.code === code) ?? countries[0];
}
