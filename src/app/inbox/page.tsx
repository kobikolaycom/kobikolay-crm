import { ConversationService } from "@/services/ConversationService";
import { InboxClient } from "./InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const conversations = await ConversationService.getConversations();

  return (
    <InboxClient
      initialConversations={JSON.parse(JSON.stringify(conversations))}
    />
  );
}
