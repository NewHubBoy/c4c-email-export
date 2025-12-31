export type C4cBaseRequest = {
  tenantUrl: string;
  ticketId: string;
  username?: string;
  password?: string;
};

export type EmailNotesRequest = C4cBaseRequest & {
  emailActivityId?: string;
};
