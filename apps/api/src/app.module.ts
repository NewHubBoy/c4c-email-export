import { Module } from "@nestjs/common";
import { C4cController } from "./controllers/c4c.controller";
import { C4cService } from "./services/c4c.service";

@Module({
  controllers: [C4cController],
  providers: [C4cService]
})
export class AppModule {}
