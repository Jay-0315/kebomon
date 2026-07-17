import { IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";
import { ARENA_ARCHETYPES, CHAR_TYPES, RARITIES, ROGUE_ARCHETYPES } from "../../rewards/character-master.util";

export class UpdateCharacterDto {
  @IsOptional()
  @IsIn(CHAR_TYPES)
  type?: string;

  @IsOptional()
  @IsIn(RARITIES)
  rarity?: string;

  @IsOptional()
  @IsIn(ARENA_ARCHETYPES)
  arenaArchetype?: string;

  @IsOptional()
  @IsIn(ROGUE_ARCHETYPES)
  rogueArchetype?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  hpMult?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  atkMult?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  defMult?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  spdMult?: number;
}
