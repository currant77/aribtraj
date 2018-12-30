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
fetchAndWrite();