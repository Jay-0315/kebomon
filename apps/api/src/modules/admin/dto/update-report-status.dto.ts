import { IsIn } from "class-validator";

export class UpdateReportStatusDto {
  @IsIn(["RESOLVED", "DISMISSED"])
  status: "RESOLVED" | "DISMISSED";
}
