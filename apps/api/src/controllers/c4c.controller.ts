import { Body, Controller, Get, Post } from "@nestjs/common";
import { C4cBaseRequest, EmailNotesRequest } from "../dto/c4c.dto";
import { C4cService } from "../services/c4c.service";

@Controller("c4c")
export class C4cController {
  constructor(private readonly c4cService: C4cService) {}

  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Post("service-request-texts")
  getServiceRequestTexts(@Body() body: C4cBaseRequest) {
    return this.c4cService.getServiceRequestTexts(
      body.tenantUrl,
      body.ticketId,
      body.username,
      body.password
    );
  }

  @Post("internal-memos")
  getInternalMemos(@Body() body: C4cBaseRequest) {
    return this.c4cService.getInternalMemos(
      body.tenantUrl,
      body.ticketId,
      body.username,
      body.password
    );
  }

  @Post("email-notes")
  getEmailNotes(@Body() body: EmailNotesRequest) {
    return this.c4cService.getEmailNotes(
      body.tenantUrl,
      body.ticketId,
      body.emailActivityId,
      body.username,
      body.password
    );
  }
}
