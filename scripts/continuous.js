require('dotenv').config();

const envfile = require('envfile');
const Timeout = require('await-timeout');
const constants = require('./constants');
const Web3 = require('web3');
const fs = require('fs');
const net = require('net');
const web3 = new Web3(createProvider());
const BN = web3.utils.BN;

web3.eth.transactionBlockTimeout = 20;
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.transactionPollingTimeout = 300;

const MONTH = 3600*24*30; // seconds in month
const csvFilepath = `${__dirname}/../data/users.csv`;
const logFilepath = `${__dirname}/../data/load.log`;
let users = [];
let interrupt = false;
let csvSavePromise = null;
let env;

main();

async function main() {
  processUnique();
  csvLoad();

  const envFilePath = `${__dirname}/../.env`;
  env = envfile.parse(fs.readFileSync(envFilePath, 'utf8'));
  if (!env.CONTINUOUS_START) {
    env.CONTINUOUS_START = Math.floor(Date.now() / 1000);
  }
  fs.writeFileSync(envFilePath, envfile.stringify(env), 'utf8');

  for (let i = 0; i < users.length && !interrupt; i++) {
    const {
      account,
      claimTx, subscribeTx, burnTx, transferTx,
      claimed, subscribed, burned, transferred
    } = user(i);

    if (claimed === 'N') continue;

    let txs = [];
    if (!claimed) txs.push({ type: 'claim', tx: claimTx});
    if (subscribeTx && !subscribed) txs.push({ type: 'subscribe', tx: subscribeTx });
    if (burnTx && !burned) txs.push({ type: 'burn', tx: burnTx });
    if (!transferred) txs.push({ type: 'transfer', tx: transferTx });
    if (txs.length > 0) {
      await sendTXs(i, account, txs);
    }
  }
  
  // All jobs are finished. Ensure csv file saving finished
  if (csvSavePromise !== null) {
    await csvSavePromise;
    csvSavePromise = null;
  }

  log('Everything finished');
  process.exit();
}

async function sendTXs(userIndex, account, txs) {
  log(`Sending txs for ${account} ...`, true);

  for (let i = 0; i < txs.length && !interrupt; i++) {
    log(`Sending '${txs[i].type}' tx ...`, true);
    const sendTimestamp = Date.now();
    let receipt = null;
    let p = web3.eth.sendSignedTransaction(txs[i].tx);
    p.catch(() => {});

    const maxTries = 3;
    for (let t = 1; t <= maxTries; t++) {
      try {
        receipt = await Timeout.wrap(p, 10000, 'timeout');
      } catch (e) {
        const alreadyMined = e.message.includes('the same hash');
        if (alreadyMined) {
          log(`  Warning: ${e.message}`);
        } else {
          log(`  Error: ${e.message}`);
        }
        if (e.message.includes('reverted')) {
          receipt = { status: false };
        } else if (alreadyMined) {
          receipt = { status: true };
        } else if (t < maxTries && !interrupt) {
          log('  Try again in 3 seconds...');
          await sleep(3000);
        } else if (interrupt) {
          break;
        }
      }
      if (receipt !== null) {
        break;
      }
    }

    if (receipt) {
      log(`Sent`);

      switch (txs[i].type) {
        case 'claim': setUserClaimed(userIndex, receipt.status); break;
        case 'subscribe': setUserSubscribed(userIndex, receipt.status); break;
        case 'burn': setUserBurned(userIndex, receipt.status); break;
        case 'transfer': setUserTransferred(userIndex, receipt.status); break;
      }

      const txsHandledCount = txsHandled();
      const txsTotalCount = txsTotal();

      log(`Total txs handled: ${txsHandledCount} / ${txsTotalCount} [${Math.round(txsHandledCount / txsTotalCount * 100)}%]`, true);

      const currentTimestamp = Date.now();
      const timeDiff = currentTimestamp - sendTimestamp;

      const sleepInterval = txsInterval() - timeDiff;
      if (sleepInterval > 0) {
        log(`Sleep for ${sleepInterval} ms...`, true);
        await sleep(sleepInterval);
      }

      if (txs[i].type == 'claim' && !receipt.status) {
        break;
      }
    } else {
      log(`Unknown status`);
      break;
    }
  }

  await csvSave();

  let reconnect = false;
  if (web3.currentProvider.connection) {
    if (web3.currentProvider.connection.readyState !== web3.currentProvider.connection.OPEN) {
      reconnect = true;
    }
  } else if (!web3.currentProvider.connected) {
    reconnect = true;
  }
  if (reconnect) {
    log(`Connection with web3 provider is lost. Resetting provider...`);
    web3.setProvider(createProvider());
  }
}

function user(userIndex) {
  const user = users[userIndex].split(',');
  return {
    account: user[0],
    privateKey: user[1],
    karma: user[2],
    signature: user[3],
    claimTx: user[4],
    subscribeTx: user[5],
    burnTx: user[6],
    transferTx: user[7],
    claimed: user[8],
    subscribed: user[9],
    burned: user[10],
    transferred: user[11]
  }
}

function setUserClaimed(userIndex, claimed) {
  _setTxStatus(userIndex, claimed, 8);
}

function setUserSubscribed(userIndex, subscribed) {
  _setTxStatus(userIndex, subscribed, 9);
}

function setUserBurned(userIndex, burned) {
  _setTxStatus(userIndex, burned, 10);
}

function setUserTransferred(userIndex, transferred) {
  _setTxStatus(userIndex, transferred, 11);
}

function _setTxStatus(userIndex, status, columnIndex) {
  let user = users[userIndex].split(',');
  user[columnIndex] = status ? 'Y' : 'N';
  users[userIndex] = user.join(',');
}

function createProvider() {
  return process.env.IPC ? new Web3.providers.IpcProvider(process.env.IPC, net) : process.env.RPC;
}

function txsHandled() {
  let count = 0;
  for (let i = 0; i < users.length; i++) {
    const { claimTx, subscribeTx, burnTx, transferTx, claimed, subscribed, burned, transferred } = user(i);

    let expectedTxs = 0;
    if (claimTx) expectedTxs++;
    if (subscribeTx) expectedTxs++;
    if (burnTx) expectedTxs++;
    if (transferTx) expectedTxs++;

    if (claimed === 'N') {
      count += expectedTxs;
      continue;
    }

    if (claimed) count++;
    if (subscribed) count++;
    if (burned) count++;
    if (transferred) count++;
  }
  return count;
}

function txsTotal() {
  return constants.TOTAL_USERS * 2 + constants.TOTAL_SUBSCRIBE_TRANSACTIONS + constants.TOTAL_BURN_TRANSACTIONS;
}

function txsInterval() {
  let remainingTxsCount = txsTotal() - txsHandled();
  if (remainingTxsCount < 0) return 0;
  let remainingSeconds = env.CONTINUOUS_START - Math.floor(Date.now() / 1000) + MONTH;
  if (remainingSeconds < 0) remainingSeconds = 0;
  return Math.round(remainingSeconds / remainingTxsCount * 1000); // milliseconds
}

function csvLoad() {
  log('Loading CSV...', true);
  users = fs.readFileSync(csvFilepath, 'utf8').split('\n');
  log('CSV loaded');
}

async function csvSave() {
  if (csvSavePromise !== null) {
    await csvSavePromise; // ensure previous save is complete
  }
  csvSavePromise = new Promise(resolve => {
    setTimeout(() => {
      log('Saving CSV...', true);
      fs.writeFileSync(csvFilepath, users.join('\n'), 'utf8');
      log('CSV saved');
      resolve();
    }, 0); // run CSV saving in a separate thread to save time
  });
}

function processExited() {
  try {
    fs.unlinkSync(`${__dirname}/../data/tmp.pid`);
  } catch (e) {
  }
}

function processInterrupt() {
  log('Terminating. Please wait...', true);
  interrupt = true;
}

// Ensures the script is working alone
function processUnique() {
  let existingPID = 0;
  const pidFilepath = `${__dirname}/../data/tmp.pid`;

  try {
    existingPID = fs.readFileSync(pidFilepath, 'utf8');
  } catch (e) {
  }

  if (existingPID !== 0) {
    log(`The script is already working. PID: ${existingPID}`);
    process.exit();
  } else {
    fs.writeFileSync(pidFilepath, process.pid, 'utf8');
    process.on('exit', processExited);
    process.on('uncaughtException', processExited);
    process.on('SIGINT', processInterrupt);
    process.on('SIGTERM', processInterrupt);
  }
}

function log(message, emptyPreLine) {
  const now = new Date;
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() - 0 + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  const hours = (now.getUTCHours() - 0).toString().padStart(2, '0');
  const minutes = (now.getUTCMinutes() - 0).toString().padStart(2, '0');
  const seconds = (now.getUTCSeconds() - 0).toString().padStart(2, '0');
  const time = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  if (emptyPreLine) {
    console.log('');
    fs.appendFileSync(logFilepath, '\n', 'utf8');
  }
  const line = `${time} ${message}`;
  console.log(line);
  fs.appendFileSync(logFilepath, `${line}\n`, 'utf8');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
