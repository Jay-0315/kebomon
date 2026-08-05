import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";

@Injectable()
export class JwtStrategy {
  constructor(private readonly configService: ConfigService) {}

  verify(token: string): { sub: string; email: string; role: string } {
    try {
      return jwt.verify(
        token,
        this.configService.get<string>("JWT_SECRET")!,
      ) as { sub: string; email: string; role: string };
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }
  }
}
