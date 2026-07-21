import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MaintenanceConfigValues, resolveMaintenanceConfig } from "./maintenance-config.util";

const CACHE_TTL_MS = 5000;

/**
 * 점검 모드 설정을 5초 TTL로 캐싱한다. 미들웨어(모든 요청)와 공개 상태 조회 엔드포인트
 * (프론트가 30초 주기로 폴링) 둘 다 이 캐시를 공유해 DB 조회를 중복하지 않는다.
 */
@Injectable()
export class MaintenanceCacheService {
  constructor(private readonly prisma: PrismaService) {}

  private cache: { value: MaintenanceConfigValues; expiresAt: number } | null = null;

  async getConfig(): Promise<MaintenanceConfigValues> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.value;
    const value = await resolveMaintenanceConfig(this.prisma);
    this.cache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  }
}
