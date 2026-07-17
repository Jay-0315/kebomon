import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { allCharacterIds, getDefaultCharacterMaster, loadCharacterMasterMap } from "../rewards/character-master.util";
import { CHARACTER_NAMES } from "./character-names.constant";
import { UpdateCharacterDto } from "./dto/update-character.dto";

@Injectable()
export class AdminCharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const masterMap = await loadCharacterMasterMap(this.prisma);
    return allCharacterIds().map((id) => {
      const master = masterMap.get(id)!;
      const names = CHARACTER_NAMES[id];
      return {
        ...master,
        name: names?.name ?? `#${id}`,
        korName: names?.korName ?? `#${id}`,
      };
    });
  }

  async update(id: number, dto: UpdateCharacterDto) {
    if (!CHARACTER_NAMES[id]) throw new NotFoundException("존재하지 않는 캐릭터입니다.");

    const current = (await loadCharacterMasterMap(this.prisma)).get(id) ?? getDefaultCharacterMaster(id);
    const next = {
      type: dto.type ?? current.type,
      rarity: dto.rarity ?? current.rarity,
      arenaArchetype: dto.arenaArchetype ?? current.arenaArchetype,
      rogueArchetype: dto.rogueArchetype ?? current.rogueArchetype,
      hpMult: dto.hpMult ?? current.hpMult,
      atkMult: dto.atkMult ?? current.atkMult,
      defMult: dto.defMult ?? current.defMult,
      spdMult: dto.spdMult ?? current.spdMult,
    };

    const saved = await this.prisma.characterMaster.upsert({
      where: { id },
      create: { id, ...next },
      update: next,
    });

    return { ...saved, name: CHARACTER_NAMES[id].name, korName: CHARACTER_NAMES[id].korName };
  }
}
