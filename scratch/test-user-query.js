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

  // 1. Try with graph.instagram.com and basic fields
  try {
    const url = `https://graph.instagram.com/v21.0/${userId}?fields=id,username,name&access_token=${creds.pageToken}`;
    console.log(`\nTesting graph.instagram.com with basic fields on own account...`);
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }

  // 2. Try with graph.instagram.com and all fields
  try {
    const fields = "name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user";
    const url = `https://graph.instagram.com/v21.0/${userId}?fields=${fields}&access_token=${creds.pageToken}`;
    console.log(`\nTesting graph.instagram.com with ALL fields on own account...`);
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

main().finally(() => prisma.$disconnect());
