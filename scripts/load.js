require('dotenv').config();

const assert = require('assert');
const { program } = require('commander');
const constants = require('./constants');
const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3(process.env.RPC);

web3.eth.transactionBlockTimeout = 20;
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.transactionPollingTimeout = 300;

const filepath = `${__dirname}/../users.csv`;
let onePassTxLimit = 1; // how many transactions per one pass
let limitPasses = 1; // how many passes. 0 for unlimited passes
let passesPerformed = 0;
let startTimestamp;
let users = [];
let txs = [];

main();

async function main() {
  program.version('1.0.0');
  program.name("npm run load").usage("-- <options>");
  program.requiredOption('-t, --type <type>', 'transaction type. Possible values: claim, subscribe, burn, transfer');
  program.option('-p, --passes [number]', 'how many passes to perform. 0 for unlimited', limitPasses);
  program.option('-l, --tx-limit [number]', 'how many transactions per one pass', onePassTxLimit);
  program.parse(process.argv);

  if (['claim', 'subscribe', 'burn', 'transfer', 'renew'].indexOf(program.type) < 0) {
    program.help();
  }

  limitPasses = parseInt(program.passes);
  if (isNaN(limitPasses)) {
    program.help();
  }

  onePassTxLimit = parseInt(program.txLimit);
  if (isNaN(onePassTxLimit)) {
    program.help();
  }

  readCSV();

  eval(program.type)();
}

async function claim() {
  console.log('Performing `claim` transactions...');

  startTimestamp = process.hrtime();
  for (let i = 0; i < users.length; i++) {
    const { claimTx, claimed } = parseUser(users[i].split(','));

    if (!claimed) txs.push({ i, tx: claimTx });
    if (await _sendTXs(i, users.length, 'claim')) break;
  }
}

async function subscribe() {
  console.log('Performing `subscribe` transactions...');
  const maxSubscribeOperations = constants.TOTAL_SUBSCRIBE_TRANSACTIONS;

  startTimestamp = process.hrtime();
  for (let i = 0; i < maxSubscribeOperations; i++) {
    const { subscribeTx, claimed, subscribed } = parseUser(users[i].split(','));

    if (!subscribeTx) continue;
    if (!claimed) continue; // skip user who didn't claim their tokens
    if (!subscribed) txs.push({ i, tx: subscribeTx });
    if (await _sendTXs(i, maxSubscribeOperations, 'subscribe')) break;
  }
}

async function burn() {
  console.log('Performing `burn` transactions...');
  const maxBurnOperations = constants.TOTAL_BURN_TRANSACTIONS;

  startTimestamp = process.hrtime();
  for (let i = 0; i < maxBurnOperations; i++) {
    const { burnTx, claimed, burned } = parseUser(users[i].split(','));

    if (!burnTx) continue;
    if (!claimed) continue; // skip user who didn't claim their tokens
    if (!burned) txs.push({ i, tx: burnTx });
    if (await _sendTXs(i, maxBurnOperations, 'burn')) break;
  }
}

async function transfer() {
  console.log('Performing `transfer` transactions...');

  startTimestamp = process.hrtime();
  for (let i = 0; i < users.length; i++) {
    const { transferTx, claimed, transferred } = parseUser(users[i].split(','));

    if (!claimed) continue; // skip user who didn't claim their tokens
    if (!transferred) txs.push({ i, tx: transferTx });
    if (await _sendTXs(i, users.length, 'transfer')) break;
  }
}

async function renew() {
  console.log('Performing `renew` transactions...');

  const subscriptionsABI = [{"type":"event","name":"Canceled","inputs":[{"type":"address","name":"recipient","internalType":"address","indexed":true},{"type":"uint256","name":"expiresAt","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"DurationUpdated","inputs":[{"type":"uint256","name":"duration","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"type":"address","name":"previousOwner","internalType":"address","indexed":true},{"type":"address","name":"newOwner","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"PriceUpdated","inputs":[{"type":"uint256","name":"price","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"RelayHubChanged","inputs":[{"type":"address","name":"oldRelayHub","internalType":"address","indexed":true},{"type":"address","name":"newRelayHub","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RenewBeforeUpdated","inputs":[{"type":"uint256","name":"renewBefore","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"SignerUpdated","inputs":[{"type":"address","name":"signer","internalType":"address","indexed":false}],"anonymous":false},{"type":"event","name":"Subscribed","inputs":[{"type":"address","name":"recipient","internalType":"address","indexed":true},{"type":"address","name":"payer","internalType":"address","indexed":true},{"type":"uint256","name":"burnedPoints","internalType":"uint256","indexed":false},{"type":"uint256","name":"expiresAt","internalType":"uint256","indexed":false},{"type":"bool","name":"renewable","internalType":"bool","indexed":false}],"anonymous":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"},{"type":"bytes","name":"","internalType":"bytes"}],"name":"acceptRelayedCall","inputs":[{"type":"address","name":"relay","internalType":"address"},{"type":"address","name":"from","internalType":"address"},{"type":"bytes","name":"encodedFunction","internalType":"bytes"},{"type":"uint256","name":"transactionFee","internalType":"uint256"},{"type":"uint256","name":"gasPrice","internalType":"uint256"},{"type":"uint256","name":"gasLimit","internalType":"uint256"},{"type":"uint256","name":"nonce","internalType":"uint256"},{"type":"bytes","name":"approvalData","internalType":"bytes"},{"type":"uint256","name":"","internalType":"uint256"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"cancel","inputs":[{"type":"address","name":"recipient","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"duration","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"expiration","inputs":[{"type":"address","name":"account","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"getHubAddr","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"owner_","internalType":"address"},{"type":"address","name":"gsnApprover","internalType":"address"},{"type":"address","name":"subredditPoints","internalType":"address"},{"type":"uint256","name":"price_","internalType":"uint256"},{"type":"uint256","name":"duration_","internalType":"uint256"},{"type":"uint256","name":"renewBefore_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"trustedSigner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOwner","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"owner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"postRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"},{"type":"bool","name":"success","internalType":"bool"},{"type":"uint256","name":"actualCharge","internalType":"uint256"},{"type":"bytes32","name":"preRetVal","internalType":"bytes32"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"preRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"price","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"relayHubVersion","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renew","inputs":[{"type":"address","name":"recipient","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"renewBefore","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renounceOwnership","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"setDefaultRelayHub","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"subscribe","inputs":[{"type":"address","name":"recipient","internalType":"address"},{"type":"bool","name":"renewable","internalType":"bool"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"transferOwnership","inputs":[{"type":"address","name":"newOwner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateDuration","inputs":[{"type":"uint256","name":"duration_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateGSNApprover","inputs":[{"type":"address","name":"gsnApprover","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updatePrice","inputs":[{"type":"uint256","name":"price_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateRenewBefore","inputs":[{"type":"uint256","name":"renewBefore_","internalType":"uint256"}],"constant":false}];
  const subscriptionsContract = new web3.eth.Contract(subscriptionsABI, process.env.SUBSCRIPTIONS_CONTRACT);

  const maxRenewOperations = constants.TOTAL_SUBSCRIBE_TRANSACTIONS;
  const chainId = await web3.eth.getChainId();
  let nonce = await web3.eth.getTransactionCount(process.env.KARMA_SOURCE);

  // Prepare all `renew` transactions
  let preparedTxs = {};
  for (let i = 0; i < maxRenewOperations; i++) {
    const { account, subscribed, renewed } = parseUser(users[i].split(','));

    if (!subscribed) continue; // skip user who didn't subscribe
    if (!renewed) {
      const renew = subscriptionsContract.methods.renew(account);
      const tx = await web3.eth.accounts.signTransaction({
        nonce: nonce++,
        chainId: chainId.toString(),
        to: process.env.SUBSCRIPTIONS_CONTRACT,
        data: renew.encodeABI(),
        gasPrice: '0',
        gas: 80000
      }, process.env.KARMA_SOURCE_KEY);
      preparedTxs[i] = tx.rawTransaction;

      if (Object.keys(preparedTxs).length >= onePassTxLimit * limitPasses) break;
    }
  }

  // Perform prepared transactions
  startTimestamp = process.hrtime();
  for (let i = 0; i < maxRenewOperations; i++) {
    const { account, subscribed, renewed } = parseUser(users[i].split(','));

    if (i in preparedTxs) {
      txs.push({ i, tx: preparedTxs[i] });
      delete preparedTxs[i];
    }
    if (await _sendTXs(i, maxRenewOperations, 'renew')) {
      break;
    }
  }
}

function readCSV() {
  console.log('Reading CSV...');
  users = fs.readFileSync(filepath, 'utf8').split('\n');
}

function parseUser(user) {
  return {
    account: user[0],
    privateKey: user[1],
    karma: user[2],
    signature: user[3],
    claimTx: user[4],
    subscribeTx: user[5],
    burnTx: user[6],
    transferTx: user[7],
    claimed: user[8] === 'Y',
    subscribed: user[9] === 'Y',
    burned: user[10] === 'Y',
    transferred: user[11] === 'Y',
    renewed: user[12] === 'Y'
  }
}

function setUserClaimed(userIndex, claimed) {
  _setUserBooleanFlag(userIndex, claimed, 8);
}

function setUserSubscribed(userIndex, subscribed) {
  _setUserBooleanFlag(userIndex, subscribed, 9);
}

function setUserBurned(userIndex, burned) {
  _setUserBooleanFlag(userIndex, burned, 10);
}

function setUserTransferred(userIndex, transferred) {
  _setUserBooleanFlag(userIndex, transferred, 11);
}

function setUserRenewed(userIndex, renewed) {
  _setUserBooleanFlag(userIndex, renewed, 12);
}

function _setUserBooleanFlag(userIndex, flag, columnIndex) {
  let user = users[userIndex].split(',');
  user[columnIndex] = flag ? 'Y' : 'N';
  users[userIndex] = user.join(',');
}

async function _sendTXs(i, maxIterations, txType) {
  if (txs.length >= onePassTxLimit || i == maxIterations - 1) {
    // Send transactions and wait them to be mined
    console.log(`  Sending ${txs.length} '${txType}' transactions...`);
    let txPromises = [];
    for (let t = 0; t < txs.length; t++) {
      txPromises.push(web3.eth.sendSignedTransaction(txs[t].tx));
    }
    console.log(`  Waiting for mining...`);
    const txReceipts = await Promise.all(txPromises);
    console.log(`  Mined`);
    for (let t = 0; t < txs.length; t++) {
      switch (txType) {
      case 'claim': setUserClaimed(txs[t].i, txReceipts[t].status); break;
      case 'subscribe': setUserSubscribed(txs[t].i, txReceipts[t].status); break;
      case 'burn': setUserBurned(txs[t].i, txReceipts[t].status); break;
      case 'transfer': setUserTransferred(txs[t].i, txReceipts[t].status); break;
      case 'renew': setUserRenewed(txs[t].i, txReceipts[t].status); break;
      }
    }
    txs = [];
    fs.writeFileSync(filepath, users.join('\n'), 'utf8');

    passesPerformed++;

    const timeDiff = process.hrtime(startTimestamp);
    const timeDiffSeconds = (timeDiff[0] * 1e9 + timeDiff[1]) / 1e9;
    const totalTxsMined = onePassTxLimit * passesPerformed;
    const performance = Math.round((totalTxsMined / timeDiffSeconds + Number.EPSILON) * 100) / 100;

    console.log(`  Total TXs mined: ${totalTxsMined}`);
    console.log(`  Current performance: ${performance} txs/sec`);
    console.log();

    if (limitPasses > 0 && passesPerformed >= limitPasses) {
      return true;
    }
  }
  return false;
}
