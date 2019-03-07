/* Heroku Application code */


const assert = require('assert');
const fetch = require('cross-fetch');
const {
  Client,
} = require('pg');

require('dotenv').config();

// (1) Query the arbitraj.io API ===============================================

const API_HOST = 'https://arbitraj.io/api/v1/';

const minSpread = 2.0;
const minVolume = 0;
const queryAssets = ['USD', 'BTC', 'ETH', 'USDT', 'EUR'];
const include = 'all';
const limit = 50;

const spreadsRequestBody = {
  minSpread: minSpread,
  minVolume: minVolume,
  assets: queryAssets,
  include: include,
  limit: limit,
};

/**
 * Retrives the current spread from arbitraj.io
 * @param {*} body - The API request body
 * @param {*} request - The request function
 */
async function getSpreads(body = spreadsRequestBody, request = fetch) {
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
  } catch (err) {
    err.message = 'API call to arbitraj.io failed: ' + err.message;
    throw err;
  }
};

// (2) Update database assets and exchanges ====================================

/**
 * Update the database assets
 * @param {Set} assets - Assets to add to database
 * @param {Client} client - node postgres database client
 */
async function updateAssets(assets, client) {
  try {
    const existing = new Set();
    const res = await client.query(
        'SELECT assetcode FROM assets');
    res.rows.forEach((row) => {
      existing.add(row.assetcode);
    });

    assets.forEach((asset) => {
      if (!existing.has(asset)) {
        // console.log(`Adding asset ${asset}`);
        client.query(
            `INSERT INTO assets VALUES('${asset}')`);
      }
    });
  } catch (err) {
    err.message = 'Error updating database assets: ' + err.message;
    throw err;
  }
};

/**
 * Update the database exchanges
 * @param {Set} exchs - Exchanges to add to database
 * @param {Client} client - node postgres database client
 */
async function updateExchanges(exchs, client) {
  try {
    const existing = new Set();
    const res = await client.query(
        'SELECT exchcode FROM exchanges');
    res.rows.forEach((row) => {
      existing.add(row.exchcode);
    });

    exchs.forEach((exch) => {
      if (!existing.has(exch)) {
        // console.log(`Adding exchange ${exch}`);
        client.query(
            `INSERT INTO exchanges VALUES('${exch}')`);
      }
    });
  } catch (err) {
    err.message = 'Error updating databse assets: ' + err.message;
    throw err;
  }
};

// (3) Retrieve cycle id =======================================================

/**
 * Retrives the cycle id; adds cycle to db is necessary
 * @param {object} cycle - Cycle object
 * @param {Client} client - node postgres database client
 * @return {Promise<number>} The cycle id
 */
async function getCycleId(cycle, client) {
  let res;
  try {
    res = await client.query(
        `SELECT cycleid FROM cycles WHERE \
        startasset = '${cycle.startasset}' AND \
        arbasset = '${cycle.arbasset}' AND \
        endasset = '${cycle.endasset}' AND \
        startexch = '${cycle.startexch}' AND \
        endexch = '${cycle.endexch}'`);
  } catch (err) {
    err.message = 'Error reading cycle id from the database:' + err.message;
    throw err;
  }

  // Check return
  assert(res !== undefined);
  assert(res.rows.length < 2);

  // Add cycle to the database
  if (res.rows.length == 0) {
    try {
      await client.query(
          `INSERT INTO cycles(
            startasset, arbasset, endasset, startexch, endexch) \
          VALUES( '${cycle.startasset}', '${cycle.arbasset}', \
            '${cycle.endasset}', '${cycle.startexch}', '${cycle.endexch}')`);
    } catch (err) {
      err.message = `Error adding cycle ('${cycle.startasset}', \
        '${cycle.arbasset}', '${cycle.endasset}', \ 
        '${cycle.startexch}', '${cycle.endexch}') to the database:`
        + err.message;
      throw err;
    }

    return getCycleId(cycle, client);
  } else {
    return res.rows[0].cycleid;
  }
};

/**
 * Main function for script
 */
async function main() {
  // Query API
  const spreads = await getSpreads();

  // Process return
  const assets = new Set();
  const exchs = new Set();
  const cycles = [];

  if (spreads && spreads.success) {
    spreads.result.forEach((element) => {
      const startasset = element.low.pair;
      const arbasset = element.coin.symbol;
      const endasset = element.high.pair;
      const startexch = element.low.exchange.slug;
      const endexch = element.high.exchange.slug;

      assets.add(startasset);
      assets.add(arbasset);
      assets.add(endasset);
      exchs.add(startexch);
      exchs.add(endexch);

      cycles.push({
        startasset: startasset,
        arbasset: arbasset,
        endasset: endasset,
        startexch: startexch,
        endexch: endexch,
        spread: element.spread,
      });
    });
  }

  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
  } catch (err) {
    err.message = 'Failed to connect to database client: ' + err.message;
    throw err;
  }

  // Update database
  await updateAssets(assets, client);
  await updateExchanges(exchs, client);

  // Add data
  for (let i = 0; i < cycles.length; i++) {
    try {
      const cycleid = await getCycleId(cycles[i], client);

      await client.query(
          `INSERT INTO data(spread, cycleid)
        VALUES(${cycles[i].spread}, ${cycleid})`);
    } catch (err) {
      console.log(err.message);
    }
  }

  // Log update
  const d = new Date();
  console.log(
      `Updated ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} at ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`);
}

main().then(() => {
  process.exit();
}).catch((err) => {
  console.log(err.message);
  process.exit(1);
});

// Connect to server
/*
const http = require('http');

const localPort = 5000;
const PORT = process.env.PORT || localPort;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

// Listen on port
server.listen(PORT, () => {
  let str;
  if (PORT == localPort) {
    str = `http://localhost:${localPort}`;
  } else {
    str = `${PORT}`;
  }

  console.log(`Server running on ${str}/`);
});
*/
