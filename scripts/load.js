require('dotenv').config();

const assert = require('assert');
const Timeout = require('await-timeout');
const { program } = require('commander');
const constants = require('./constants');
const http = require('http');
const Queue = require('./queue');
const { URL } = require('url');
const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3(process.env.RPC);
const BN = web3.utils.BN;

const subredditPointsABI = [{"type":"event","name":"Approval","inputs":[{"type":"address","name":"owner","internalType":"address","indexed":true},{"type":"address","name":"spender","internalType":"address","indexed":true},{"type":"uint256","name":"value","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"AuthorizedOperator","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"tokenHolder","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"Burned","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"uint256","name":"amount","internalType":"uint256","indexed":false},{"type":"bytes","name":"data","internalType":"bytes","indexed":false},{"type":"bytes","name":"operatorData","internalType":"bytes","indexed":false}],"anonymous":false},{"type":"event","name":"DefaultOperatorAdded","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"DefaultOperatorRemoved","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"Minted","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"amount","internalType":"uint256","indexed":false},{"type":"bytes","name":"data","internalType":"bytes","indexed":false},{"type":"bytes","name":"operatorData","internalType":"bytes","indexed":false}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"type":"address","name":"previousOwner","internalType":"address","indexed":true},{"type":"address","name":"newOwner","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RelayHubChanged","inputs":[{"type":"address","name":"oldRelayHub","internalType":"address","indexed":true},{"type":"address","name":"newRelayHub","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RevokedOperator","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"tokenHolder","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"Sent","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"amount","internalType":"uint256","indexed":false},{"type":"bytes","name":"data","internalType":"bytes","indexed":false},{"type":"bytes","name":"operatorData","internalType":"bytes","indexed":false}],"anonymous":false},{"type":"event","name":"SignerUpdated","inputs":[{"type":"address","name":"signer","internalType":"address","indexed":false}],"anonymous":false},{"type":"event","name":"Transfer","inputs":[{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"value","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"},{"type":"bytes","name":"","internalType":"bytes"}],"name":"acceptRelayedCall","inputs":[{"type":"address","name":"relay","internalType":"address"},{"type":"address","name":"from","internalType":"address"},{"type":"bytes","name":"encodedFunction","internalType":"bytes"},{"type":"uint256","name":"transactionFee","internalType":"uint256"},{"type":"uint256","name":"gasPrice","internalType":"uint256"},{"type":"uint256","name":"gasLimit","internalType":"uint256"},{"type":"uint256","name":"nonce","internalType":"uint256"},{"type":"bytes","name":"approvalData","internalType":"bytes"},{"type":"uint256","name":"","internalType":"uint256"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"addDefaultOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"allowance","inputs":[{"type":"address","name":"owner","internalType":"address"},{"type":"address","name":"spender","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"approve","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"authorizeOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[{"type":"address","name":"account","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"burn","inputs":[{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"userData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"pure","payable":false,"outputs":[{"type":"uint8","name":"","internalType":"uint8"}],"name":"decimals","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"decreaseAllowance","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"subtractedValue","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address[]","name":"","internalType":"address[]"}],"name":"defaultOperators","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"distributionContract","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"getHubAddr","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"increaseAllowance","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"addedValue","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"owner_","internalType":"address"},{"type":"address","name":"gsnApprover_","internalType":"address"},{"type":"address","name":"distributionContract_","internalType":"address"},{"type":"string","name":"subreddit_","internalType":"string"},{"type":"string","name":"name_","internalType":"string"},{"type":"string","name":"symbol_","internalType":"string"},{"type":"address[]","name":"defaultOperators_","internalType":"address[]"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"trustedSigner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOperatorFor","inputs":[{"type":"address","name":"operator","internalType":"address"},{"type":"address","name":"tokenHolder","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOwner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"mint","inputs":[{"type":"address","name":"operator","internalType":"address"},{"type":"address","name":"account","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"userData","internalType":"bytes"},{"type":"bytes","name":"operatorData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"name","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"operatorBurn","inputs":[{"type":"address","name":"account","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"data","internalType":"bytes"},{"type":"bytes","name":"operatorData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"operatorSend","inputs":[{"type":"address","name":"sender","internalType":"address"},{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"userData","internalType":"bytes"},{"type":"bytes","name":"operatorData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"owner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"postRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"},{"type":"bool","name":"success","internalType":"bool"},{"type":"uint256","name":"actualCharge","internalType":"uint256"},{"type":"bytes32","name":"preRetVal","internalType":"bytes32"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"preRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"relayHubVersion","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"removeDefaultOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renounceOwnership","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"revokeOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"setDefaultRelayHub","inputs":[],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"subreddit","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"symbol","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"totalSupply","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transfer","inputs":[{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transferFrom","inputs":[{"type":"address","name":"sender","internalType":"address"},{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"transferOwnership","inputs":[{"type":"address","name":"newOwner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateDistributionContract","inputs":[{"type":"address","name":"distributionContract_","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateGSNApprover","inputs":[{"type":"address","name":"gsnApprover","internalType":"address"}],"constant":false}];
const subredditPointsContract = new web3.eth.Contract(subredditPointsABI, process.env.POINTS_CONTRACT);

const subscriptionsABI = [{"type":"event","name":"Canceled","inputs":[{"type":"address","name":"recipient","internalType":"address","indexed":true},{"type":"uint256","name":"expiresAt","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"DurationUpdated","inputs":[{"type":"uint256","name":"duration","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"type":"address","name":"previousOwner","internalType":"address","indexed":true},{"type":"address","name":"newOwner","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"PriceUpdated","inputs":[{"type":"uint256","name":"price","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"RelayHubChanged","inputs":[{"type":"address","name":"oldRelayHub","internalType":"address","indexed":true},{"type":"address","name":"newRelayHub","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RenewBeforeUpdated","inputs":[{"type":"uint256","name":"renewBefore","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"SignerUpdated","inputs":[{"type":"address","name":"signer","internalType":"address","indexed":false}],"anonymous":false},{"type":"event","name":"Subscribed","inputs":[{"type":"address","name":"recipient","internalType":"address","indexed":true},{"type":"address","name":"payer","internalType":"address","indexed":true},{"type":"uint256","name":"burnedPoints","internalType":"uint256","indexed":false},{"type":"uint256","name":"expiresAt","internalType":"uint256","indexed":false},{"type":"bool","name":"renewable","internalType":"bool","indexed":false}],"anonymous":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"},{"type":"bytes","name":"","internalType":"bytes"}],"name":"acceptRelayedCall","inputs":[{"type":"address","name":"relay","internalType":"address"},{"type":"address","name":"from","internalType":"address"},{"type":"bytes","name":"encodedFunction","internalType":"bytes"},{"type":"uint256","name":"transactionFee","internalType":"uint256"},{"type":"uint256","name":"gasPrice","internalType":"uint256"},{"type":"uint256","name":"gasLimit","internalType":"uint256"},{"type":"uint256","name":"nonce","internalType":"uint256"},{"type":"bytes","name":"approvalData","internalType":"bytes"},{"type":"uint256","name":"","internalType":"uint256"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"cancel","inputs":[{"type":"address","name":"recipient","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"duration","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"expiration","inputs":[{"type":"address","name":"account","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"getHubAddr","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"owner_","internalType":"address"},{"type":"address","name":"gsnApprover","internalType":"address"},{"type":"address","name":"subredditPoints","internalType":"address"},{"type":"uint256","name":"price_","internalType":"uint256"},{"type":"uint256","name":"duration_","internalType":"uint256"},{"type":"uint256","name":"renewBefore_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"trustedSigner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOwner","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"owner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"postRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"},{"type":"bool","name":"success","internalType":"bool"},{"type":"uint256","name":"actualCharge","internalType":"uint256"},{"type":"bytes32","name":"preRetVal","internalType":"bytes32"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"preRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"price","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"relayHubVersion","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renew","inputs":[{"type":"address","name":"recipient","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"renewBefore","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renounceOwnership","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"setDefaultRelayHub","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"subscribe","inputs":[{"type":"address","name":"recipient","internalType":"address"},{"type":"bool","name":"renewable","internalType":"bool"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"transferOwnership","inputs":[{"type":"address","name":"newOwner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateDuration","inputs":[{"type":"uint256","name":"duration_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateGSNApprover","inputs":[{"type":"address","name":"gsnApprover","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updatePrice","inputs":[{"type":"uint256","name":"price_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateRenewBefore","inputs":[{"type":"uint256","name":"renewBefore_","internalType":"uint256"}],"constant":false}];
const subscriptionsContract = new web3.eth.Contract(subscriptionsABI, process.env.SUBSCRIPTIONS_CONTRACT);

web3.eth.transactionBlockTimeout = 20;
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.transactionPollingTimeout = 300;

const csvFilepath = `${__dirname}/../data/users.csv`;
const logFilepath = `${__dirname}/../data/load.log`;
let receiptQueue = new Queue();
let onePassTxLimit = 1; // how many transactions per one pass
let onePassInterval = 5; // interval between passes (in seconds)
let limitPasses = 1; // how many passes allowed. 0 for unlimited passes
let limitReceiptQueue = 200; // how many receipts in queue allowed
let passesPerformed = 0;
let startTimestamp;
let users = [];
let txs = [];
let sendingFinished = false;
let receiptsFinished = false;
let interrupt = false;
let interruptReceipts = false;
let successCount = 0;
let revertCount = 0;
let errorCount = 0;
let csvSavePromise = null;

const rpcUrl = new URL(process.env.RPC);
const httpOptions = {
  host: rpcUrl.hostname,
  path: rpcUrl.pathname,
  port: rpcUrl.port,
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
};

main();

async function main() {
  program.name("npm run load").usage("-- <options>");
  program.option('-t, --type <type>', 'transaction type. Possible values: claim, subscribe, burn, transfer');
  program.option('-p, --passes [number]', 'how many passes to perform. 0 for unlimited', limitPasses);
  program.option('-l, --tx-limit [number]', 'how many transactions per one pass', onePassTxLimit);
  program.option('-i, --interval [number]', 'seconds between passes', onePassInterval);
  program.option('-q, --queue-limit [number]', 'receipt queue max size. 0 to ignore receipts', limitReceiptQueue);
  program.option('-s, --stat', 'shows how many txs of each type were sent (calculates Y/N flags from users.csv)');
  program.parse(process.argv);

  if (program.stat) {
    csvLoad();
    printFlags();
    console.log();
    return;
  }

  if (['claim', 'subscribe', 'burn', 'transfer'].indexOf(program.type) < 0) {
    program.help();
  }

  limitPasses = parseInt(program.passes);
  if (isNaN(limitPasses) || limitPasses < 0) {
    program.help();
  }

  onePassTxLimit = parseInt(program.txLimit);
  if (isNaN(onePassTxLimit) || onePassTxLimit <= 0) {
    program.help();
  }

  onePassInterval = parseInt(program.interval);
  if (isNaN(onePassInterval) || onePassInterval <= 0) {
    program.help();
  }

  limitReceiptQueue = parseInt(program.queueLimit);
  if (isNaN(limitReceiptQueue) || limitReceiptQueue < 0) {
    program.help();
  }

  processUnique();

  csvLoad();

  startTimestamp = process.hrtime();

  // Start receipts handling thread
  if (limitReceiptQueue > 0) {
    setTimeout(handleReceipts, 0);
  } else {
    receiptsFinished = true;
  }
  
  // Sending transactions
  await eval(program.type)();
  sendingFinished = true;

  // Transactions are sent. Now, waiting for the `handleReceipts` thread to finish
  while (!receiptsFinished) {
    await sleep(10);
  }

  // All jobs are finished. Ensure csv file saving finished
  if (csvSavePromise !== null) {
    await csvSavePromise;
    csvSavePromise = null;
  }

  // Force exit to prevent awaiting for `handleReceipts` promises
  // which could hang due to network reasons
  process.exit();
}

async function claim() {
  for (let i = 0; i < users.length; i++) {
    const { claimTx, claimed } = user(i);

    if (!claimTx) continue;
    if (!claimed) txs.push({ i, tx: claimTx });
    if (!(await sendTXs(i, users.length))) break;
  }
}

async function subscribe() {
  const maxSubscribeOperations = constants.TOTAL_SUBSCRIBE_TRANSACTIONS;

  for (let i = 0; i < maxSubscribeOperations; i++) {
    const { subscribeTx, claimed, subscribed } = user(i);

    if (!subscribeTx) continue;
    if (claimed !== 'Y') continue; // skip user who didn't claim their tokens
    if (!subscribed) txs.push({ i, tx: subscribeTx });
    if (!(await sendTXs(i, maxSubscribeOperations))) break;
  }
}

async function burn() {
  const maxBurnOperations = constants.TOTAL_BURN_TRANSACTIONS;

  for (let i = 0; i < maxBurnOperations; i++) {
    const { subscribeTx, burnTx, claimed, subscribed, burned } = user(i);

    if (!burnTx) continue;
    if (claimed !== 'Y') continue; // skip user who didn't claim their tokens
    if (subscribeTx && !subscribed) continue; // skip user who didn't try to subscribe
    if (!burned) txs.push({ i, tx: burnTx });
    if (!(await sendTXs(i, maxBurnOperations))) break;
  }
}

async function transfer() {
  for (let i = 0; i < users.length; i++) {
    const { subscribeTx, burnTx, transferTx, claimed, subscribed, burned, transferred } = user(i);

    if (!transferTx) continue;
    if (claimed !== 'Y') continue; // skip user who didn't claim their tokens
    if (subscribeTx && !subscribed) continue; // skip user who didn't try to subscribe
    if (burnTx && !burned) continue; // skip user who didn't try to burn
    if (!transferred) txs.push({ i, tx: transferTx });
    if (!(await sendTXs(i, users.length))) break;
  }
}

async function sendTXs(i, maxIterations) {
  if (txs.length < onePassTxLimit && i != maxIterations - 1) {
    return true; // skip this iteration
  }

  if (limitReceiptQueue > 0) {
    while (receiptQueue.getLength() > limitReceiptQueue && !interrupt) {
      await sleep(10);
    }
  }

  if (!interrupt) {
    log(`Sending ${txs.length} '${program.type}' transaction(s)...`, true);
    for (let t = 0; t < txs.length; t++) {
      const userIndex = txs[t].i;
      if (limitReceiptQueue > 0) {
      	let p = web3.eth.sendSignedTransaction(txs[t].tx);
      	p.catch(() => {});
        receiptQueue.enqueue({ i: userIndex, p });
      } else {
        await new Promise(resolve => {
          let req = http.request(httpOptions);
          req.write(`{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":["${txs[t].tx}"],"id":0}`, 'utf8', () => {
            req.socket.end();
            req = null;
            resolve();
          });
          req.end();
        });
        switch (program.type) {
        case 'claim': setUserClaimed(userIndex, true); break;
        case 'subscribe': setUserSubscribed(userIndex, true); break;
        case 'burn': setUserBurned(userIndex, true); break;
        case 'transfer': setUserTransferred(userIndex, true); break;
        }
      }
    }
  }
  txs = [];

  if (limitReceiptQueue === 0) {
    log(`Total sent: ${successCount}`);
    if (limitPasses > 0) {
      log(`Sending progress: ${Math.floor(successCount / (limitPasses * onePassTxLimit) * 100)}%`);
    }
  }

  if ((limitPasses > 0 && ++passesPerformed >= limitPasses) || interrupt) {
    await csvSave();
    return false;
  }

  await sleep(onePassInterval * 1000);

  return true;
}

async function handleReceipts() {
  let start = process.hrtime();
  while (true) {
    const item = receiptQueue.dequeue();

    if (!item) {
      // If the queue is empty
      if (interrupt || sendingFinished) {
        printStatistics();
        break;
      } else {
        await sleep(1);
        continue;
      }
    } else if (interruptReceipts) {
      printStatistics();
      break;
    }

    const userIndex = item.i;
    const userAddress = user(userIndex).account;
    const maxTries = 3;

    let receipt = null;
    for (let t = 1; t <= maxTries; t++) {
      try {
        receipt = await Timeout.wrap(item.p, 10000, 'timeout');
      } catch (e) {
        log(`  Error for ${user(userIndex).account}: ${e.message}`);
        if (e.message.includes('reverted')) {
          receipt = { status: false };
        } else if (t < maxTries && !interruptReceipts) {
          log('  Try again in 3 seconds...');
          await sleep(3000);
        } else if (interruptReceipts) {
          break;
        }
      }
      if (receipt !== null) {
        break;
      }
    }

    if (program.type === 'claim') {
      if (receipt) {
        setUserClaimed(userIndex, receipt.status);
      } else {
        let claimed = undefined;
        for (let t = 1; t <= maxTries; t++) {
          try {
            let p = subredditPointsContract.methods.balanceOf(userAddress).call();
            p.catch(() => {});
            const balance = await Timeout.wrap(p, 10000, 'timeout');
            claimed = ('0' !== balance);
          } catch (e) {
            log(`  Cannot get user balance for ${userAddress}. Error: ${e.message}`);
            if (t < maxTries && !interruptReceipts) {
              log('  Try again in 3 seconds...');
              await sleep(3000);
            } else if (interruptReceipts) {
              break;
            }
          }
        }
        if (claimed === true) {
          setUserClaimed(userIndex, true);
        } else {
          errorCount++;
        }
      }
    } else if (program.type === 'subscribe') {
      if (receipt) {
        setUserSubscribed(userIndex, receipt.status);
      } else {
        let subscribed = undefined;
        for (let t = 1; t <= maxTries; t++) {
          try {
            let p = subscriptionsContract.methods.expiration(userAddress).call();
            p.catch(() => {});
            const expiration = await Timeout.wrap(p, 10000, 'timeout');
            subscribed = ('0' !== expiration);
          } catch (e) {
            log(`  Cannot get expiration date for ${userAddress}. Error: ${e.message}`);
            if (t < maxTries && !interruptReceipts) {
              log('  Try again in 3 seconds...');
              await sleep(3000);
            } else if (interruptReceipts) {
              break;
            }
          }
        }
        if (subscribed === true) {
          setUserSubscribed(userIndex, true);
        } else {
          errorCount++;
        }
      }
    } else if (program.type === 'burn') {
      if (receipt) {
        setUserBurned(userIndex, receipt.status);
      } else {
        errorCount++;
      }
    } else if (program.type === 'transfer') {
      if (receipt) {
        setUserTransferred(userIndex, receipt.status);
      } else {
        errorCount++;
      }
    }

    if (revertCount > 0 || errorCount > 0) {
      interrupt = true;
    }

    const diff = process.hrtime(start);
    const seconds = (diff[0] * 1e9 + diff[1]) / 1e9;
    if (seconds >= onePassInterval) {
      printStatistics();
      start = process.hrtime();
    }

    if ((successCount + revertCount) % (limitReceiptQueue * 2) === 0) {
      await csvSave();
    }
  }

  await csvSave();
  if (csvSavePromise !== null) {
    await csvSavePromise;
    csvSavePromise = null;
  }

  log('Finished');

  receiptsFinished = true;
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
  if (status) {
    successCount++;
  } else {
    revertCount++;
  }
}

function printFlags() {
  let claims = 0;
  let subscriptions = 0;
  let burns = 0;
  let transfers = 0;
  for (let i = 0; i < users.length; i++) {
    const { claimed, subscribed, burned, transferred } = user(i);
    if (claimed) claims++;
    if (subscribed) subscriptions++;
    if (burned) burns++;
    if (transferred) transfers++;
  }
  log(`Claims:        ${claims}`, true);
  log(`Subscriptions: ${subscriptions}`);
  log(`Burns:         ${burns}`);
  log(`Transfers:     ${transfers}`);
}

function printStatistics() {
  const timeDiff = process.hrtime(startTimestamp);
  const timeDiffSeconds = (timeDiff[0] * 1e9 + timeDiff[1]) / 1e9;
  const totalTxsMined = successCount + revertCount;
  const performance = Math.round((totalTxsMined / timeDiffSeconds + Number.EPSILON) * 100) / 100;
  const queueSize = receiptQueue.getLength();
  const totalSent = successCount + revertCount + errorCount + queueSize;

  log(`Current stat: ${successCount} succeeded, ${revertCount} reverted, ${errorCount} failed`, true);
  log(`Receipt queue size: ${queueSize}`);
  log(`Total sent: ${totalSent}`);
  if (limitPasses > 0) {
    log(`Sending progress: ${Math.floor(totalSent / (limitPasses * onePassTxLimit) * 100)}%`);
  }
  if (totalSent > 0) {
    log(`Receipts progress: ${Math.floor((totalSent - queueSize) / totalSent * 100)}%`);
  }
  log(`Cumulative performance: ${performance} txs/sec`);

  printFlags();
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

function processInterrupt(signal) {
  if (signal == 'SIGINT') {
    log('Terminating txs sending. Receipt queue will still be being handled. Please wait...', true);
    interrupt = true;
  } else if (signal == 'SIGTERM') {
    log('Terminating txs sending and receipt queue handling. Please wait...', true);
    interrupt = true;
    interruptReceipts = true;
  }
}

// Ensures the load script is working alone
function processUnique() {
  let existingPID = 0;
  const pidFilepath = `${__dirname}/../data/tmp.pid`;

  try {
    existingPID = fs.readFileSync(pidFilepath, 'utf8');
  } catch (e) {
  }

  if (existingPID !== 0) {
    log(`The load script is already working. PID: ${existingPID}`);
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
