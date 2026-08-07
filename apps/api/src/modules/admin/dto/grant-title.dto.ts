import { IsInt, Min } from "class-validator";

export class GrantTitleDto {
  @IsInt()
  @Min(1)
  titleId: number;
}
