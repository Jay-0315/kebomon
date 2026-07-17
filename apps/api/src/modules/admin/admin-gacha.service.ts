import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  GACHA_RARITIES,
  EGG_RARITIES,
  mergeRates,
  resolveGachaConfig,
} from "../rewards/gacha-config.util";
import { UpdateGachaConfigDto } from "./dto/update-gacha-config.dto";

@Injectable()
export class AdminGachaService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    return resolveGachaConfig(this.prisma);
  }

  async updateConfig(dto: UpdateGachaConfigDto) {
    const current = await resolveGachaConfig(this.prisma);

    const next = {
      gachaRates: mergeRates(current.gachaRates, dto.gachaRates, GACHA_RARITIES),
      normalEggRates: mergeRates(current.normalEggRates, dto.normalEggRates, EGG_RARITIES.normal),
      bigEggRates: mergeRates(current.bigEggRates, dto.bigEggRates, EGG_RARITIES.big),
      goldenEggRates: mergeRates(current.goldenEggRates, dto.goldenEggRates, EGG_RARITIES.golden),
      pityRareThreshold: dto.pityRareThreshold ?? current.pityRareThreshold,
      pityLegendaryThreshold: dto.pityLegendaryThreshold ?? current.pityLegendaryThreshold,
    };

    return this.prisma.gachaConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...next },
      update: next,
    });
  }
}
