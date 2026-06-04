import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateCommunityPostDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(["brag", "tip", "chat"])
  category?: "brag" | "tip" | "chat";

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}
