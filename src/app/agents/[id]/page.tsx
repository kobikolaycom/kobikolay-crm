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

  // Get conversation notes for this agency
  const notes = await prisma.conversation.findMany({
    where: { agencyId: id, channelType: "MANUAL_NOTE" },
    include: {
      createdByUser: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AgencyDetailClient
      agency={JSON.parse(JSON.stringify(agency))}
      notes={JSON.parse(JSON.stringify(notes))}
    />
  );
}
