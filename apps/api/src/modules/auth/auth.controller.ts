import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt.guard";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SendVerificationDto } from "./dto/send-verification.dto";
import { SocialLoginDto } from "./dto/social-login.dto";
import { SignupDto } from "./dto/signup.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("send-verification")
  sendVerification(@Body() dto: SendVerificationDto) {
    return this.authService.sendVerificationCode(dto);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("social")
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("refresh")
  refreshToken(@CurrentUser() user: { sub: string }) {
    return this.authService.refreshToken(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("providers")
  getLinkedProviders(
    @CurrentUser() user: { sub: string },
  ) {
    return this.authService.getLinkedProviders(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("social/link")
  linkSocial(
    @CurrentUser() user: { sub: string },
    @Body() dto: SocialLoginDto,
  ) {
    return this.authService.linkSocialIdentity(user.sub, dto);
  }
}
