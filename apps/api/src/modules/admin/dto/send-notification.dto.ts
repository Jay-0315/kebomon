import { IsEmail, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class SendNotificationDto {
  @IsIn(["all", "user"])
  target!: "all" | "user";

  @ValidateIf((o) => o.target === "user")
  @IsEmail()
  email?: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(255)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  link?: string;
}
