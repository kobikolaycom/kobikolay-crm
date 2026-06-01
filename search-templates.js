const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=== DB SEARCH FOR 'ABC Turizm' ===");

  // 1. Search in EmailTemplate
  const templates = await prisma.emailTemplate.findMany();
  console.log(`\nChecking ${templates.length} EmailTemplates...`);
  templates.forEach((t) => {
    if (t.content.includes("ABC Turizm") || (t.subject && t.subject.includes("ABC Turizm")) || t.name.includes("ABC Turizm")) {
      console.log(`[EmailTemplate ID: ${t.id}] Name: "${t.name}" | Category: "${t.category}"`);
      console.log(`Subject: "${t.subject}"`);
      console.log(`Content:\n${t.content}\n-----------------------------`);
    }
  });

  // 2. Search in Campaign
  const campaigns = await prisma.campaign.findMany();
  console.log(`\nChecking ${campaigns.length} Campaigns...`);
  campaigns.forEach((c) => {
    if (c.content.includes("ABC Turizm") || c.subject.includes("ABC Turizm") || c.name.includes("ABC Turizm")) {
      console.log(`[Campaign ID: ${c.id}] Name: "${c.name}" | Subject: "${c.subject}"`);
      console.log(`Content:\n${c.content}\n-----------------------------`);
    }
  });

  // 3. Search in Agency
  const agencies = await prisma.agency.findMany({
    where: {
      companyName: {
        contains: "ABC Turizm"
      }
    }
  });
  console.log(`\nChecking Agencies matching 'ABC Turizm': ${agencies.length} found.`);
  agencies.forEach((a) => {
    console.log(`[Agency ID: ${a.id}] Name: "${a.companyName}" | Tursab: "${a.documentNo}"`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
