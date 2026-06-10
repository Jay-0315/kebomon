import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from = "Kebo <noreply@kebomon.store>";

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const subject = `[Kebo] 이메일 인증번호: ${code}`;
    const html = this.buildCodeEmail(
      code,
      "이메일 인증",
      "회원가입을 완료하려면 아래 인증번호를 입력하세요.",
    );

    await this.send(email, subject, html);
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const subject = `[Kebo] 비밀번호 재설정 인증번호: ${code}`;
    const html = this.buildCodeEmail(
      code,
      "비밀번호 재설정",
      "비밀번호를 재설정하려면 아래 인증번호를 입력하세요.",
    );

    await this.send(email, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY 미설정 — 메일 발송 스킵 (to: ${to})`);
      return;
    }

    // NestJS 전역 타임아웃(10s)보다 짧게 설정하여 orphaned promise 방지
    const EMAIL_TIMEOUT_MS = 8000;

    try {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new ServiceUnavailableException(
                "이메일 발송 시간이 초과됐습니다. 잠시 후 다시 시도해주세요.",
              ),
            ),
          EMAIL_TIMEOUT_MS,
        );
      });

      // 항상 resolve되는 래퍼로 orphaned promise의 unhandled rejection 방지
      const safePromise = this.resend.emails
        .send({ from: this.from, to, subject, html })
        .catch((e: unknown) => ({
          data: null,
          error: { name: "send_error", message: String(e), statusCode: 503 },
        }));

      const result = await Promise.race([safePromise, timeoutPromise]).finally(
        () => clearTimeout(timer),
      );

      if (result.error) {
        this.logger.error(`Resend 발송 실패: ${JSON.stringify(result.error)}`);
        throw new ServiceUnavailableException(
          "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        );
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Resend 예외: ${String(err)}`);
      throw new ServiceUnavailableException(
        "이메일 발송 중 오류가 발생했습니다.",
      );
    }
  }

  private buildCodeEmail(code: string, title: string, desc: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Kebo</div>
            <div style="font-size:13px;color:#888;margin-top:4px;">커뮤니티 서비스</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#ffffff;">${title}</h2>
            <p style="margin:0 0 28px;font-size:14px;color:#aaa;line-height:1.6;">${desc}</p>
            <div style="background:#0f0f0f;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;">
              <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#a78bfa;font-variant-numeric:tabular-nums;">${code}</div>
            </div>
            <p style="margin:20px 0 0;font-size:13px;color:#666;text-align:center;">
              이 인증번호는 <strong style="color:#aaa;">10분</strong> 동안 유효합니다.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#555;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
