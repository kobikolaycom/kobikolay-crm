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
  const messageText = 'Merhaba, bu sistem tarafından gönderilen otomatik bir test yanıtıdır.';

  const payload = JSON.stringify({
    recipient: { id: customerId },
    message: { text: messageText },
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${creds.pageToken}`,
  };

  try {
    const url = 'https://graph.instagram.com/v21.0/me/messages';
    console.log(`Sending real message to customer ID ${customerId} via graph.instagram.com...`);
    const response = await fetch(url, { method: 'POST', headers, body: payload });
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

main().finally(() => prisma.$disconnect());
