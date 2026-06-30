import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ArenaController } from "./arena.controller";
import { ArenaService } from "./arena.service";

@Module({
  imports: [PrismaModule],
  controllers: [ArenaController],
  providers: [ArenaService],
})
export class ArenaModule {}
