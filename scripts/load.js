require('dotenv').config();

const assert = require('assert');
const { program } = require('commander');
const constants = require('./constants');
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

const filepath = `${__dirname}/../users.csv`;
let rewriteCsvPromise;
let onePassTxLimit = 1; // how many transactions per one pass
let limitPasses = 1; // how many passes. 0 for unlimited passes
let totalTxsMined = 0;
let passesPerformed = 0;
let startTimestamp;
let users = [];
let txs = [];
let interrupt = false;

main();

async function main() {
  program.name("npm run load").usage("-- <options>");
  program.requiredOption('-t, --type <type>', 'transaction type. Possible values: claim, subscribe, burn, transfer');
  program.option('-p, --passes [number]', 'how many passes to perform. 0 for unlimited', limitPasses);
  program.option('-l, --tx-limit [number]', 'how many transactions per one pass', onePassTxLimit);
  program.option('--no-csv-refresh', 'disables csv file refreshing after each pass');
  program.parse(process.argv);

  if (['claim', 'subscribe', 'burn', 'transfer', 'renew'].indexOf(program.type) < 0) {
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

  processUnique();

  readCSV();

  eval(program.type)();
}

async function claim() {
  startTimestamp = process.hrtime();
  for (let i = 0; i < users.length; i++) {
    const { claimTx, claimed } = user(i);

    if (!claimTx) continue;
    if (!claimed) txs.push({ i, tx: claimTx });
    if (await _sendTXs(i, users.length, 'claim')) break;
  }

  await rewriteCsvPromise;
  log('Finished', true);
}

async function subscribe() {
  const maxSubscribeOperations = constants.TOTAL_SUBSCRIBE_TRANSACTIONS;

  startTimestamp = process.hrtime();
  for (let i = 0; i < maxSubscribeOperations; i++) {
    const { subscribeTx, claimed, subscribed } = user(i);

    if (!subscribeTx) continue;
    if (claimed !== 'Y') continue; // skip user who didn't claim their tokens
    if (!subscribed) txs.push({ i, tx: subscribeTx });
    if (await _sendTXs(i, maxSubscribeOperations, 'subscribe')) break;
  }

  await rewriteCsvPromise;
  log('Finished', true);
}

async function burn() {
  const maxBurnOperations = constants.TOTAL_BURN_TRANSACTIONS;

  startTimestamp = process.hrtime();
  for (let i = 0; i < maxBurnOperations; i++) {
    const { subscribeTx, burnTx, claimed, subscribed, burned } = user(i);

    if (!burnTx) continue;
    if (claimed !== 'Y') continue; // skip user who didn't claim their tokens
    if (subscribeTx && !subscribed) continue; // skip user who didn't try to subscribe
    if (!burned) txs.push({ i, tx: burnTx });
    if (await _sendTXs(i, maxBurnOperations, 'burn')) break;
  }

  await rewriteCsvPromise;
  log('Finished', true);
}

async function transfer() {
  startTimestamp = process.hrtime();
  for (let i = 0; i < users.length; i++) {
    const { subscribeTx, burnTx, transferTx, claimed, subscribed, burned, transferred } = user(i);

    if (!transferTx) continue;
    if (claimed !== 'Y') continue; // skip user who didn't claim their tokens
    if (subscribeTx && !subscribed) continue; // skip user who didn't try to subscribe
    if (burnTx && !burned) continue; // skip user who didn't try to burn
    if (!transferred) txs.push({ i, tx: transferTx });
    if (await _sendTXs(i, users.length, 'transfer')) break;
  }

  await rewriteCsvPromise;
  log('Finished', true);
}

async function renew() {
  const maxRenewOperations = constants.TOTAL_SUBSCRIBE_TRANSACTIONS;
  const chainId = await web3.eth.getChainId();
  let nonce = await web3.eth.getTransactionCount(process.env.KARMA_SOURCE);

  // Prepare all `renew` transactions
  let preparedTxs = {};
  for (let i = 0; i < maxRenewOperations; i++) {
    const { account, subscribed, renewed } = user(i);

    if (subscribed !== 'Y') continue; // skip user who didn't subscribe
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
    const { account, subscribed, renewed } = user(i);

    if (i in preparedTxs) {
      txs.push({ i, tx: preparedTxs[i] });
      delete preparedTxs[i];
    }
    if (await _sendTXs(i, maxRenewOperations, 'renew')) {
      break;
    }
  }

  await rewriteCsvPromise;
  log('Finished', true);
}

function readCSV() {
  log('Reading CSV...', true);
  users = fs.readFileSync(filepath, 'utf8').split('\n');
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
    transferred: user[11],
    renewed: user[12]
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
    log(`Sending ${txs.length} '${txType}' transactions...`, true);
    let txPromises = [];
    for (let t = 0; t < txs.length; t++) {
      let p = web3.eth.sendSignedTransaction(txs[t].tx);
      p.catch(() => {});
      txPromises.push(p);
    }
    log(`Waiting for mining...`);
    let txReceipts = [];
    let successCount = 0;
    let revertCount = 0;
    let errorCount = 0;
    let minBlockNumber = Number.MAX_SAFE_INTEGER;
    let maxBlockNumber = 0;
    const maxTries = 3;
    for (let p = 0; p < txPromises.length && !interrupt; p++) {
      let receipt = null;
      for (let t = 1; t <= maxTries; t++) {
        try {
          receipt = await txPromises[p];
        } catch (e) {
          log(`  ERROR for ${user(txs[p].i).account}: ${e.message}`);
          if (e.message.includes('reverted')) {
            receipt = { status: false };
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
        if (receipt.status) {
          successCount++;
        } else {
          revertCount++;
        }
        if (receipt.blockNumber < minBlockNumber) {
          minBlockNumber = receipt.blockNumber;
        }
        if (receipt.blockNumber > maxBlockNumber) {
          maxBlockNumber = receipt.blockNumber;
        }
      } else {
        errorCount++;
      }
      txReceipts.push(receipt);
    }
    log(`Processed (${successCount} succeeded, ${revertCount} reverted, ${errorCount} failed)`);
    if (minBlockNumber < Number.MAX_SAFE_INTEGER && maxBlockNumber > 0) {
      log(`Blocks range: ${minBlockNumber} - ${maxBlockNumber}`);
    }
    for (let t = 0; t < txReceipts.length; t++) {
      const userIndex = txs[t].i;
      const userAddress = user(userIndex).account;
      const receipt = txReceipts[t];

      if (txType === 'claim') {
        if (receipt) {
          setUserClaimed(userIndex, receipt.status);
          totalTxsMined++;
        } else {
          let claimed = undefined;
          while (claimed === undefined) {
            try {
              let p = subredditPointsContract.methods.balanceOf(userAddress).call();
              p.catch(() => {});
              claimed = ('0' !== await p);
            } catch (e) {
              log(`  Cannot get user balance for ${userAddress}. Error: ${e.message}`);
              if (interrupt) break;
              log('  Try again in 3 seconds...');
              await sleep(3000);
            }
          }
          if (claimed === true) {
            setUserClaimed(userIndex, true);
            totalTxsMined++;
          }
        }
      } else if (txType === 'subscribe') {
        if (receipt) {
          setUserSubscribed(userIndex, receipt.status);
          totalTxsMined++;
        } else {
          let subscribed = undefined;
          while (subscribed === undefined) {
            try {
              let p = subscriptionsContract.methods.expiration(userAddress).call();
              p.catch(() => {});
              subscribed = ('0' !== await p);
            } catch (e) {
              log(`  Cannot get expiration date for ${userAddress}. Error: ${e.message}`);
              if (interrupt) break;
              log('  Try again in 3 seconds...');
              await sleep(3000);
            }
          }
          if (subscribed === true) {
            setUserSubscribed(userIndex, true);
            totalTxsMined++;
          }
        }
      } else if (txType === 'burn' && receipt) {
        setUserBurned(userIndex, receipt.status);
        totalTxsMined++;
      } else if (txType === 'transfer' && receipt) {
        setUserTransferred(userIndex, receipt.status);
        totalTxsMined++;
      } else if (txType === 'renew' && receipt) {
        setUserRenewed(userIndex, receipt.status);
        totalTxsMined++;
      }
    }
    txs = [];

    const timeDiff = process.hrtime(startTimestamp);

    if (program.csvRefresh) {
      await _rewriteCSV();
    }

    const timeDiffSeconds = (timeDiff[0] * 1e9 + timeDiff[1]) / 1e9;
    const performance = Math.round((totalTxsMined / timeDiffSeconds + Number.EPSILON) * 100) / 100;

    log(`TXs mined since start: ${totalTxsMined}`);
    log(`Cumulative performance: ${performance} txs/sec`);

    if ((limitPasses > 0 && ++passesPerformed >= limitPasses) || revertCount || errorCount || interrupt) {
      if (!program.csvRefresh) {
        await _rewriteCSV();
      }
      return true;
    }
  }
  return false;
}

async function _rewriteCSV() {
  await rewriteCsvPromise;
  rewriteCsvPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      fs.writeFileSync(filepath, users.join('\n'), 'utf8');
      resolve();
    }, 0); // run CSV saving in a separate thread to save time
  });
}

function processExited() {
  try {
    fs.unlinkSync(`${__dirname}/tmp.pid`);
  } catch (e) {
  }
}

function processInterrupt() {
  log('Terminating the script, please wait...', true);
  interrupt = true;
}

// Ensures the load script is working alone
function processUnique() {
  let existingPID = 0;

  try {
    existingPID = fs.readFileSync(`${__dirname}/tmp.pid`, 'utf8');
  } catch (e) {
  }

  if (existingPID !== 0) {
    log(`The load script is already working. PID: ${existingPID}`);
    process.exit();
  } else {
    fs.writeFileSync(`${__dirname}/tmp.pid`, process.pid, 'utf8');
    process.on('exit', processExited);
    process.on('uncaughtException', processExited);
    process.on('SIGINT', processInterrupt);
    process.on('SIGTERM', processInterrupt);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  }
  console.log(`${time} ${message}`);
}
