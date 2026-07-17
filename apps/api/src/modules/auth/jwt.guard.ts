import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtStrategy } from "./jwt.strategy";
import { isSuspensionExpired, reactivateIfExpired } from "./suspension.util";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtStrategy: JwtStrategy,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("인증 토큰이 없습니다.");
    }

    const token = authHeader.slice(7);
    const payload = this.jwtStrategy.verify(token);

    // 토큰 자체는 유효해도 그 사이 계정이 정지됐을 수 있으므로 매 요청마다 현재 상태를 재확인
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, suspendedUntil: true },
    });
    if (!user) throw new UnauthorizedException("정지된 계정입니다.");

    if (user.status === "SUSPENDED") {
      if (isSuspensionExpired(user)) {
        await reactivateIfExpired(this.prisma, user);
      } else {
        throw new UnauthorizedException("정지된 계정입니다.");
      }
    }

    request.user = payload;
    return true;
  }
}
