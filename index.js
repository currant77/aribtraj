/* Heroku Application code */
const http = require('http');

// Port
const localPort = 5000;
let PORT = process.env.PORT || localPort;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

server.listen(PORT, () => {
  let str;
  
  if (PORT == localPort) {
    str = `http://localhost:${localPort}`;
  } else {
    str = `${PORT}`;
  }

  console.log(`Server running on ${str}/`);
});

/*
const fs = require('fs');
const fetch = require('cross-fetch');
require('dotenv').config();

const API_HOST = 'https://arbitraj.io/api/v1/';

const requestBody = {
  minSpread: 5.0,
  minVolume: 100000,
  assets: ['BTC', 'USD', 'ETH'],
  exclude: ['gemini', 'huobi'],
  filter: ['BCD'],
  limit: 50
};

async function getSpreads(body = requestBody, request = fetch) {
  try {
    const result = await request(`${API_HOST}spreads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY,
      },
      body: JSON.stringify(body),
    });

    return result.json();

  } catch(e) {
    console.error('Something went wrong', e.text())
  }
};

function callback(err) {
  if (err) {
    console.error(err);
  }
  console.log('done');
};

function fetchAndWrite(filename = 'jsonfile', filesystem = fs) {
  getSpreads().then(res => {
    filesystem.writeFile(
      `${filename}.json`,
      JSON.stringify(res),
      'utf8',
      callback,
    );
  });
};

console.log(`${API_HOST}spreads`);
console.log(JSON.stringify(requestBody));
fetchAndWrite(); */