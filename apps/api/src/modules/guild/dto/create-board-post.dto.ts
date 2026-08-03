import { IsOptional, IsString } from "class-validator";

export class CreateBoardPostDto {
  @IsString()
  userId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
