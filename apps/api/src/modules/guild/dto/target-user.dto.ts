import { IsString } from "class-validator";

/** kick / transfer-ownership처럼 "대상 유저 하나만 지정"하는 요청 공용 shape */
export class TargetUserDto {
  @IsString()
  userId: string;

  @IsString()
  targetUserId: string;
}
