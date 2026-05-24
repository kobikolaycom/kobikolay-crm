async function main() {
  try {
    const url = 'https://api.github.com/repos/kobikolaycom/kobikolay-crm/commits/main';
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error fetching from GitHub:', e);
  }
}

main();
