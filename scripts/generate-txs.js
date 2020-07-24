require('dotenv').config();

const assert = require('assert');
const constants = require('./constants');
const cp = require('child_process');
const Web3 = require('web3');
const fs = require('fs');
const os = require('os');
const net = require('net');
const web3 = new Web3(process.env.IPC ? new Web3.providers.IpcProvider(process.env.IPC, net) : process.env.RPC);

let chainId;
let users;

main();

async function main() {
  const filepath = `${__dirname}/../data/users.csv`;
  users = fs.readFileSync(filepath, 'utf8').split('\n');
  chainId = await web3.eth.getChainId();

  await generate('claim');
  await generate('subscribe');
  await generate('burn');
  await generate('transfer');

  fs.writeFileSync(filepath, users.join('\n'), 'utf8');

  process.exit();
}

async function generate(type) {
  let results = [];
  let resultsReceived = 0;
  const maxThreads = os.cpus().length;

  let length = users.length;
  if (type == 'subscribe') {
    length = constants.TOTAL_SUBSCRIBE_TRANSACTIONS;
  } else if (type == 'burn') {
    length = constants.TOTAL_BURN_TRANSACTIONS;
  }

  console.log(`Generate '${type}' transactions...`);
  for (let i = 0; i < maxThreads; i++) {
    const thread = cp.fork(`${__dirname}/generate-txs-child.js`);
    thread.send({
      i,
      type,
      users,
      start: Math.floor(length * i / maxThreads),
      end: Math.floor(length * (i+1) / maxThreads),
      chainId: chainId.toString()
    });
    thread.on('message', m => {
      results[m.i] = m.txs;
      thread.disconnect();
      resultsReceived++;
    });
  }
  while (resultsReceived < maxThreads) {
    await sleep(10);
  }
  let u = 0;
  let totalTxLength = 0;
  for (let i = 0; i < maxThreads; i++) {
    const txs = results[i];
    totalTxLength += txs.length;
    for (let t = 0; t < txs.length; t++, u++) {
      users[u] = `${users[u]},${txs[t]}`; // append a column
    }
  }
  assert(totalTxLength === length);
  for (; u < users.length; u++) {
    users[u] = `${users[u]},`; // append an empty column
  }
  console.log('  Done');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
