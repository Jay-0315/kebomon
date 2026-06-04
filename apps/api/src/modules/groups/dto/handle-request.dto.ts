import { IsEnum } from "class-validator";

export class HandleJoinRequestDto {
  @IsEnum(["APPROVED", "REJECTED"])
  action: "APPROVED" | "REJECTED";
}
