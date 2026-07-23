import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { BannersService } from "./banners.service";

@UseGuards(JwtAuthGuard)
@Controller("banners")
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get("active")
  findActive() {
    return this.bannersService.findActive();
  }
}
