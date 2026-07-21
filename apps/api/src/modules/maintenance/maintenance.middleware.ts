import { Injectable, NestMiddleware } from "@nestjs/common";
import { MaintenanceCacheService } from "./maintenance-cache.service";

/** 점검 모드가 켜져 있으면 (admin/auth/health/maintenance 라우트 제외) 모든 요청을 503으로 막는다. */
@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly cache: MaintenanceCacheService) {}

  async use(
    _req: unknown,
    res: { status: (code: number) => { json: (body: unknown) => void } },
    next: () => void,
  ) {
    const config = await this.cache.getConfig();
    if (config.enabled) {
      res.status(503).json({ maintenance: true, message: config.message, endsAt: config.endsAt });
      return;
    }
    next();
  }
}
