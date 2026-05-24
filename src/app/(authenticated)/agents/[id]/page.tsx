import { AgencyService } from "@/services/AgencyService";
import { notFound } from "next/navigation";
import { AgencyDetailClient } from "./AgencyDetailClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgencyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const agency = await AgencyService.getById(id);

  if (!agency) notFound();

  // Get ALL conversations for this agency (omnichannel history)
  const conversations = await prisma.conversation.findMany({
    where: { agencyId: id },
    include: {
      createdByUser: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Filter notes for backward compat (used in activities timeline)
  const notes = conversations.filter((c) => c.channelType === "MANUAL_NOTE");

  // Fetch active system settings for integrations
  const settings = await prisma.systemSetting.findMany({
    where: {
      category: { in: ["whatsapp", "meta"] }
    }
  });

  const isWhatsAppActive = settings.some(s => s.category === "whatsapp" && s.key === "token" && s.value.trim() !== "");
  const isMetaActive = settings.some(s => s.category === "meta" && s.key === "pageToken" && s.value.trim() !== "") && 
                       settings.some(s => s.category === "meta" && s.key === "igAccountId" && s.value.trim() !== "");

  return (
    <AgencyDetailClient
      agency={JSON.parse(JSON.stringify(agency))}
      notes={JSON.parse(JSON.stringify(notes))}
      conversations={JSON.parse(JSON.stringify(conversations))}
      activeIntegrations={{
        whatsapp: isWhatsAppActive,
        instagram: isMetaActive,
        messenger: isMetaActive,
      }}
    />
  );
}
