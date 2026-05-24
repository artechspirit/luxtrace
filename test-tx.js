const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/transactions', // Let's check what transactions exist
  method: 'GET',
};

// We don't have a token easily, maybe we can fetch from DB directly
