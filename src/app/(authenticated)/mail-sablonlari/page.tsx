import { EmailTemplateService } from "@/services/EmailTemplateService";
import { PageHeader } from "@/components/layout/PageHeader";
import { MailTemplatesClient } from "./MailTemplatesClient";

export const dynamic = "force-dynamic";

export default async function MailSablonlariPage() {
  let templates: any[] = [];
  try {
    templates = await EmailTemplateService.list();
  } catch (error) {
    console.error("Failed to load email templates:", error);
  }

  // Şablon yoksa varsayılanları oluştur
  if (templates.length === 0) {
    try {
      await EmailTemplateService.seedDefaults();
      templates = await EmailTemplateService.list();
    } catch (error) {
      console.error("Failed to seed defaults:", error);
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Mail Şablonları"
        description="Teklif ve tanıtım e-postalarınızın ön yazılarını ve özel gün şablonlarınızı yönetin."
      />
      <MailTemplatesClient
        templates={JSON.parse(JSON.stringify(templates))}
      />
    </div>
  );
}
