import { Prisma } from "@prisma/client";

export type AgencyWithRelations = Prisma.AgencyGetPayload<{
  include: {
    sectors: true;
    contacts: true;
    taxInfo: true;
    offers: true;
    mailLogs: true;
    activities: {
      include: {
        creator: { select: { id: true; name: true; role: { select: { name: true } } } };
        assignedTo: { select: { id: true; name: true; role: { select: { name: true } } } };
      };
    };
  };
}>;

export type ConversationWithMessages = Prisma.ConversationGetPayload<{
  include: {
    agency: { select: { companyName: true } };
    messages: true;
    assignedUser: { select: { id: true; name: true } };
  };
}>;

export type UserWithRole = Prisma.UserGetPayload<{
  include: { role: true };
}>;
