import { Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";

@Injectable()
export class JwtStrategy {
  verify(token: string): { sub: string; email: string; role: string } {
    try {
      return jwt.verify(
        token,
        process.env.JWT_SECRET || "kebo-dev-secret",
      ) as { sub: string; email: string; role: string };
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }
  }
}
