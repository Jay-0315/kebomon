import { IsEmail, IsIn, IsOptional } from "class-validator";

export class SendVerificationDto {
  @IsEmail()
  email: string;

  @IsIn(["SIGNUP", "RESET_PASSWORD"])
  purpose: "SIGNUP" | "RESET_PASSWORD";

  @IsOptional()
  @IsIn(["ko", "ja", "en"])
  lang?: "ko" | "ja" | "en";
}
