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

  if (!creds.pageToken) {
    console.error('No pageToken configured!');
    return;
  }

  // Test sending with a dummy recipient ID to see the exact error response from the Instagram Graph API
  const payload = JSON.stringify({
    recipient: { id: 'dummy_id_12345' },
    message: { text: 'Test message' },
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${creds.pageToken}`,
  };

  try {
    const url = 'https://graph.instagram.com/v21.0/me/messages';
    console.log('Sending dummy message to graph.instagram.com/v21.0/me/messages...');
    const response = await fetch(url, { method: 'POST', headers, body: payload });
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

main().finally(() => prisma.$disconnect());
