import { ArrayMaxSize, IsIn, IsInt, IsString, Min } from "class-validator";

export class SaveDeckDto {
  @IsString()
  userId: string;

  @IsIn(["attack", "defense"])
  deckType: "attack" | "defense";

  // arena.service.ts의 saveDeck()이 slots.slice(0, 4)로 이미 4개까지만 쓰므로 그 가정을 그대로 명시
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayMaxSize(4)
  slots: number[];
}
