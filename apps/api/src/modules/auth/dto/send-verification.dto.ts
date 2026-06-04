import { IsEmail, IsIn } from "class-validator";

export class SendVerificationDto {
  @IsEmail()
  email: string;

  @IsIn(["SIGNUP", "RESET_PASSWORD"])
  purpose: "SIGNUP" | "RESET_PASSWORD";
}
