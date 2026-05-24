const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settingsList = await prisma.systemSetting.findMany({
    where: { category: 'meta' }
  });

  const creds = {};
  for (const s of settingsList) {
    creds[s.key] = s.value;
  }

  const customerId = '1498514815143795'; // Customer ID from live DB!

  // Try with graph.instagram.com and basic fields (id, username, name)
  try {
    const url = `https://graph.instagram.com/v21.0/${customerId}?fields=id,username,name&access_token=${creds.pageToken}`;
    console.log(`\nTesting graph.instagram.com with basic fields...`);
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

main().finally(() => prisma.$disconnect());
