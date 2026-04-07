const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/rpc',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', console.error);

req.write(JSON.stringify({
  action: 'create',
  entity: 'restaurantes',
  data: {
    name: 'Marianita',
    status: 'Active',
    access_code: '2200'
  }
}));

req.end();
