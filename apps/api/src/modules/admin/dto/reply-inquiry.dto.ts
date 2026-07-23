import { IsString, MaxLength, MinLength } from "class-validator";

export class ReplyInquiryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reply!: string;
}
