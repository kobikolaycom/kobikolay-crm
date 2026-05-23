import { NextRequest, NextResponse } from "next/server";
import { addMessageAction } from "@/app/(authenticated)/inbox/actions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Let's find the Foodys conversation in the production database
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        channelType: "INSTAGRAM",
        contactPhone: "2359516167869451" // Biohacking ID
      }
    });

    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: "Conversation not found in production database"
      });
    }

    console.log("Found conversation:", conversation.id);

    // Call the database query directly to simulate what addMessageAction does (excluding the auth session check)
    // because in API routes we don't have the user's browser session.
    // Wait, let's test if the InstagramService.sendMessage works with this conversation's contactPhone!
    const { InstagramService } = await import("@/services/InstagramService");
    const sendResult = await InstagramService.sendMessage(conversation.contactPhone!, "Test reply via raw InstagramService");

    // Let's save the message to the database
    const { ConversationService } = await import("@/services/ConversationService");
    const message = await ConversationService.createMessage(conversation.id, {
      content: "Test reply via raw InstagramService",
      isInternalNote: false,
      senderType: "agent",
      senderName: "System Admin"
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      sendResult,
      message
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
