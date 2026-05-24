const { InstagramService } = require('../src/services/InstagramService');

async function test() {
  const customerId = '1498514815143795'; // Customer ID from live DB!
  console.log('Simulating getUserProfile for customer:', customerId);
  
  try {
    const profile = await InstagramService.getUserProfile(customerId);
    console.log('Profile result:', JSON.stringify(profile, null, 2));
    
    const displayName = InstagramService.formatDisplayName(profile);
    console.log('Formatted display name:', displayName);
  } catch (e) {
    console.error('Error during simulation:', e);
  }
}

test();
