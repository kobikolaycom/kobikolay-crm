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

  const userId = '36126276256986044'; // own ID

  // Test fields one by one to see which ones are valid
  const fieldsToTest = [
    'name',
    'username',
    'profile_pic',
    'profile_picture_url',
    'follower_count',
    'is_verified_user',
    'media_count'
  ];

  for (const field of fieldsToTest) {
    try {
      const url = `https://graph.instagram.com/v21.0/${userId}?fields=${field}&access_token=${creds.pageToken}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Field '${field}': Status ${response.status}`, data.error ? `Error: ${data.error.message}` : 'Success!');
    } catch (e) {
      console.error(`Field '${field}' failed:`, e);
    }
  }
}

main().finally(() => prisma.$disconnect());
