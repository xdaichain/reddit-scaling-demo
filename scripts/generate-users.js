require('dotenv').config();

const assert = require('assert');
const constants = require('./constants');
const Web3 = require('web3');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const net = require('net');
const web3 = new Web3(process.env.IPC ? new Web3.providers.IpcProvider(process.env.IPC, net) : process.env.RPC);

main();

async function main() {
  const subreddit = process.env.SUBREDDIT;
  const karmaSourcePrivateKey = process.env.KARMA_SOURCE_KEY;

  assert(!!subreddit);
  assert(subreddit.length != 0);
  assert(!!karmaSourcePrivateKey);

  const totalAddresses = constants.TOTAL_USERS;
  const subscribes = constants.TOTAL_SUBSCRIBE_TRANSACTIONS; // how many calls of `subscribe`
  const availablePoints = 50000000 / 2; // initially available points
  const chainId = await web3.eth.getChainId();

  console.log('Generate unique addresses...');
  const tmpFilepath = `${__dirname}/../data/tmp.users.${chainId}`;
  let addressGenerated = {};
  let lines = [];
  try {
    lines = fs.readFileSync(tmpFilepath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const address = lines[i].split(',')[0];
      addressGenerated[address] = true;
    }
  } catch(e) {
  }
  while (lines.length < totalAddresses) {
    const accounts = [];
    const promises = [];
    const batchReq = new web3.BatchRequest();
    const maxBatchSize = 100;
    const batchSize = Math.min(totalAddresses - lines.length, maxBatchSize);
    for (let i = 0; i < batchSize; i++) {
      const acc = web3.eth.accounts.create();
      accounts.push(acc);
      promises.push(new Promise((resolve, reject) => {
        batchReq.add(web3.eth.getTransactionCount.request(acc.address, 'latest', (err, nonce) => {
          if (err) reject(err);
          else resolve(nonce);
        }));
      }));
    }
    await batchReq.execute();
    const nonces = await Promise.all(promises);
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      if (nonces[i] === 0 && !addressGenerated.hasOwnProperty(acc.address)) {
        lines.push(`${acc.address},${acc.privateKey}`);
        addressGenerated[acc.address] = true;
        console.log(`  Progress: ${lines.length}/${totalAddresses}`);
      }
      if (lines.length % (maxBatchSize*10) === 0) {
        fs.writeFileSync(tmpFilepath, lines.join('\n'), 'utf8');
      }
    }
  }
  delete addressGenerated;
  fs.unlinkSync(tmpFilepath);

  console.log('Add signatures and random karma for `claim`...');
  let results = [];
  let resultsReceived = 0;
  const maxThreads = os.cpus().length;
  for (let i = 0; i < maxThreads; i++) {
    const thread = cp.fork(`${__dirname}/generate-users-child.js`);
    thread.send({
      i,
      lines,
      start: Math.floor(lines.length * i / maxThreads),
      end: Math.floor(lines.length * (i+1) / maxThreads)
    });
    thread.on('message', m => {
      results[m.i] = m.results;
      thread.disconnect();
      resultsReceived++;
    });
  }
  while (resultsReceived < maxThreads) {
    await sleep(10);
  }
  let l = 0;
  let totalLinesNumber = 0;
  for (let i = 0; i < maxThreads; i++) {
    const res = results[i];
    totalLinesNumber += res.length;
    for (let c = 0; c < res.length; c++, l++) {
      lines[l] = `${lines[l]},${res[c]}`; // append the `karma` and `signature` columns
    }
  }
  assert(totalLinesNumber === lines.length);

  let totalKarma = 0;
  let minUserPoints1 = availablePoints;
  let minUserPoints2 = availablePoints;
  for (let i = 0; i < totalAddresses; i++) {
    const line = lines[i].split(',');
    const karma = line[2] - 0;
    totalKarma += karma;
  }
  for (let i = 0; i < totalAddresses; i++) {
    const line = lines[i].split(',');
    const karma = line[2];
    const userPoints = availablePoints * karma / totalKarma;
    if (i < subscribes) {
      if (userPoints < minUserPoints1) {
        minUserPoints1 = userPoints;
      }
    } else {
      if (userPoints < minUserPoints2) {
        minUserPoints2 = userPoints;
      }
    }
  }
  console.log(`  minUserPoints for the first ${subscribes} addresses = ${minUserPoints1}`);
  console.log(`  minUserPoints for remaining ${totalAddresses-subscribes} addresses = ${minUserPoints2}`);
  console.log('  Done');

  process.chdir(`${__dirname}/..`);

  const filepath = `${process.cwd()}/data/users.csv`;
  fs.writeFileSync(filepath, lines.join('\n'), 'utf8');

  console.log(`Finished. Users are saved to ${filepath}`);

  process.exit();
}

function randomInt(min, max) {
  return min + Math.floor((max - min) * Math.random());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
