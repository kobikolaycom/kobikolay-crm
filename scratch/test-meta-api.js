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

  console.log('Using pageToken starting with:', creds.pageToken ? creds.pageToken.substring(0, 15) + '...' : 'empty');

  if (!creds.pageToken) {
    console.error('No pageToken configured!');
    return;
  }

  // 1. Test graph.instagram.com/me
  try {
    const url = `https://graph.instagram.com/me?fields=id,username&access_token=${creds.pageToken}`;
    console.log('\nTesting graph.instagram.com/me...');
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error fetching graph.instagram.com/me:', e);
  }

  // 2. Test graph.instagram.com/v21.0/me
  try {
    const url = `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${creds.pageToken}`;
    console.log('\nTesting graph.instagram.com/v21.0/me...');
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error fetching graph.instagram.com/v21.0/me:', e);
  }
}

main().finally(() => prisma.$disconnect());
