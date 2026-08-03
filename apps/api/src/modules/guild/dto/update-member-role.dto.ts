import { IsIn, IsString } from "class-validator";

export class UpdateMemberRoleDto {
  @IsString()
  userId: string;

  @IsString()
  targetUserId: string;

  @IsIn(["officer", "member"])
  role: "officer" | "member";
}
