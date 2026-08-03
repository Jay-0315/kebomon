import { IsInt, Max, Min } from "class-validator";
import { WAVE_COUNT } from "../tower-pool.constant";

export class SubmitResultDto {
  // 서버가 어차피 Math.max(0, Math.min(WAVE_COUNT, ...))로 클램프하지만(tower-defense.service.ts)
  // 그 가정을 DTO 단에서도 같은 범위로 명시 — 클램프 로직 자체는 그대로 둔다
  @IsInt()
  @Min(0)
  @Max(WAVE_COUNT)
  wavesCleared: number;
}
