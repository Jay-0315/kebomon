import { Controller, Get } from "@nestjs/common";
import { RaidGateway } from "./raid.gateway";

@Controller("raid")
export class RaidController {
  constructor(private readonly raidGateway: RaidGateway) {}

  @Get("lobby")
  getLobby() {
    return this.raidGateway.getLobbyStatus();
  }
}
