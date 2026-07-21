import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateReportStatusDto {
  @IsIn(["RESOLVED", "DISMISSED"])
  status: "RESOLVED" | "DISMISSED";

  @IsOptional()
  @IsString()
  @MaxLength(255)
  resolutionNote?: string;
}
