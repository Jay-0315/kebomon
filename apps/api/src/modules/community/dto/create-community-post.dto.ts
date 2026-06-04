import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateCommunityPostDto {
  @IsString()
  userId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(["brag", "tip", "chat"])
  category?: "brag" | "tip" | "chat";

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
