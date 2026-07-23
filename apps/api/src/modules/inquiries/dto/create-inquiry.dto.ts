import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export class CreateInquiryDto {
  @IsEnum(["bug", "account", "suggestion", "etc"])
  category!: "bug" | "account" | "suggestion" | "etc";

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;
}
