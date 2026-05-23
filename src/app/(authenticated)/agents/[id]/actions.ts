"use server";

import { auth } from "@/auth";
import { AgencyService } from "@/services/AgencyService";
import { ActivityService } from "@/services/ActivityService";
import { ConversationService } from "@/services/ConversationService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ActivityType, CallStatus } from "@prisma/client";

export async function getAgencyDetailAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return AgencyService.getById(id);
}

export async function createActivityAction(data: {
  agencyId: string;
  type: ActivityType;
  content: string;
  dueDate?: string;
  assignedToId?: string;
  callStatus?: CallStatus;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  const result = await ActivityService.createActivity(
    data.agencyId,
    data.type,
    data.content,
    data.dueDate ? new Date(data.dueDate) : undefined,
    (session.user as any).id,
    data.assignedToId || (session.user as any).id,
    data.callStatus
  );

  revalidatePath(`/agents/${data.agencyId}`);
  return result;
}

export async function completeTaskAction(taskId: string, agencyId: string, completionNote?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  await ActivityService.completeTask(taskId, completionNote);
  revalidatePath(`/agents/${agencyId}`);
}

export async function addNoteAction(agencyId: string, content: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  // Create a MANUAL_NOTE conversation
  const conversation = await ConversationService.createConversation({
    channelType: "MANUAL_NOTE",
    agencyId,
    createdByUserId: (session.user as any).id,
  });

  await ConversationService.createMessage(conversation.id, {
    content,
    senderType: "agent",
    senderName: session.user.name || "Personel",
  });

  revalidatePath(`/agents/${agencyId}`);
  return conversation;
}

export async function updateAgencyStatusAction(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  await prisma.agency.update({
    where: { id },
    data: { status: status as any },
  });

  revalidatePath(`/agents/${id}`);
}

export async function getActiveUsersForAssignAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
