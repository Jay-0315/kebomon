import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

interface RateCache {
  rates: Map<string, number>;
  updatedAt: Date;
}

const FALLBACK_RATES: [string, number][] = [
  ["KRW:KRW", 1],
  ["JPY:JPY", 1],
  ["JPY:KRW", 9.1],
  ["KRW:JPY", 0.11],
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

@Injectable()
export class ExchangeRatesService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private cache: RateCache | null = null;

  async onModuleInit() {
    await this.refreshRates();
  }

  private async refreshRates(): Promise<void> {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/JPY");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as {
        result: string;
        rates: Record<string, number>;
        time_last_update_utc: string;
      };

      if (data.result !== "success" || !data.rates?.KRW) {
        throw new Error("Invalid API response");
      }

      const jpyToKrw = data.rates.KRW;
      const krwToJpy = 1 / jpyToKrw;

      this.cache = {
        rates: new Map([
          ["KRW:KRW", 1],
          ["JPY:JPY", 1],
          ["JPY:KRW", jpyToKrw],
          ["KRW:JPY", krwToJpy],
        ]),
        updatedAt: new Date(),
      };

      this.logger.log(
        `환율 갱신 완료 — JPY/KRW: ${jpyToKrw.toFixed(4)} (${data.time_last_update_utc})`,
      );
    } catch (err) {
      this.logger.warn(
        `환율 갱신 실패: ${err instanceof Error ? err.message : String(err)}` +
          (this.cache ? " — 기존 캐시 유지" : " — 폴백값 사용"),
      );
    }
  }

  private async ensureCache(): Promise<Map<string, number>> {
    if (
      !this.cache ||
      Date.now() - this.cache.updatedAt.getTime() > CACHE_TTL_MS
    ) {
      await this.refreshRates();
    }
    return this.cache?.rates ?? new Map(FALLBACK_RATES);
  }

  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.ensureCache();
    return rates.get(`${from}:${to}`) ?? 1;
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getRate(from, to);
    return Math.round(amount * rate);
  }

  async findAll() {
    const rates = await this.ensureCache();
    const updatedAt = (this.cache?.updatedAt ?? new Date()).toISOString();
    return [
      { from: "KRW", to: "KRW", rate: 1, updatedAt },
      { from: "JPY", to: "JPY", rate: 1, updatedAt },
      {
        from: "JPY",
        to: "KRW",
        rate: +(rates.get("JPY:KRW") ?? 9.1).toFixed(4),
        updatedAt,
      },
      {
        from: "KRW",
        to: "JPY",
        rate: +(rates.get("KRW:JPY") ?? 0.11).toFixed(6),
        updatedAt,
      },
    ];
  }
}
