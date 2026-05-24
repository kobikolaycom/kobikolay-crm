const http = require('http');

const options = {
  hostname: '::1',
  port: 51213,
  path: '/',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`IPv6 problem with request: ${e.message}`);
});

req.end();
