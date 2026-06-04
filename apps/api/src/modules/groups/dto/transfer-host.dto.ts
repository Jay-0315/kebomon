import { IsString } from "class-validator";

export class TransferHostDto {
  @IsString()
  newHostId: string;
}
