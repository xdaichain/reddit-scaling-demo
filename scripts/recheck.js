require('dotenv').config();

const { program } = require('commander');
const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3(process.env.RPC);

const subredditPointsABI = [{"type":"event","name":"Approval","inputs":[{"type":"address","name":"owner","internalType":"address","indexed":true},{"type":"address","name":"spender","internalType":"address","indexed":true},{"type":"uint256","name":"value","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"AuthorizedOperator","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"tokenHolder","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"Burned","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"uint256","name":"amount","internalType":"uint256","indexed":false},{"type":"bytes","name":"data","internalType":"bytes","indexed":false},{"type":"bytes","name":"operatorData","internalType":"bytes","indexed":false}],"anonymous":false},{"type":"event","name":"DefaultOperatorAdded","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"DefaultOperatorRemoved","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"Minted","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"amount","internalType":"uint256","indexed":false},{"type":"bytes","name":"data","internalType":"bytes","indexed":false},{"type":"bytes","name":"operatorData","internalType":"bytes","indexed":false}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"type":"address","name":"previousOwner","internalType":"address","indexed":true},{"type":"address","name":"newOwner","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RelayHubChanged","inputs":[{"type":"address","name":"oldRelayHub","internalType":"address","indexed":true},{"type":"address","name":"newRelayHub","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RevokedOperator","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"tokenHolder","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"Sent","inputs":[{"type":"address","name":"operator","internalType":"address","indexed":true},{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"amount","internalType":"uint256","indexed":false},{"type":"bytes","name":"data","internalType":"bytes","indexed":false},{"type":"bytes","name":"operatorData","internalType":"bytes","indexed":false}],"anonymous":false},{"type":"event","name":"SignerUpdated","inputs":[{"type":"address","name":"signer","internalType":"address","indexed":false}],"anonymous":false},{"type":"event","name":"Transfer","inputs":[{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"value","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"},{"type":"bytes","name":"","internalType":"bytes"}],"name":"acceptRelayedCall","inputs":[{"type":"address","name":"relay","internalType":"address"},{"type":"address","name":"from","internalType":"address"},{"type":"bytes","name":"encodedFunction","internalType":"bytes"},{"type":"uint256","name":"transactionFee","internalType":"uint256"},{"type":"uint256","name":"gasPrice","internalType":"uint256"},{"type":"uint256","name":"gasLimit","internalType":"uint256"},{"type":"uint256","name":"nonce","internalType":"uint256"},{"type":"bytes","name":"approvalData","internalType":"bytes"},{"type":"uint256","name":"","internalType":"uint256"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"addDefaultOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"allowance","inputs":[{"type":"address","name":"owner","internalType":"address"},{"type":"address","name":"spender","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"approve","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"authorizeOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[{"type":"address","name":"account","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"burn","inputs":[{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"userData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"pure","payable":false,"outputs":[{"type":"uint8","name":"","internalType":"uint8"}],"name":"decimals","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"decreaseAllowance","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"subtractedValue","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address[]","name":"","internalType":"address[]"}],"name":"defaultOperators","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"distributionContract","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"getHubAddr","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"increaseAllowance","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"addedValue","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"owner_","internalType":"address"},{"type":"address","name":"gsnApprover_","internalType":"address"},{"type":"address","name":"distributionContract_","internalType":"address"},{"type":"string","name":"subreddit_","internalType":"string"},{"type":"string","name":"name_","internalType":"string"},{"type":"string","name":"symbol_","internalType":"string"},{"type":"address[]","name":"defaultOperators_","internalType":"address[]"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"trustedSigner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOperatorFor","inputs":[{"type":"address","name":"operator","internalType":"address"},{"type":"address","name":"tokenHolder","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOwner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"mint","inputs":[{"type":"address","name":"operator","internalType":"address"},{"type":"address","name":"account","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"userData","internalType":"bytes"},{"type":"bytes","name":"operatorData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"name","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"operatorBurn","inputs":[{"type":"address","name":"account","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"data","internalType":"bytes"},{"type":"bytes","name":"operatorData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"operatorSend","inputs":[{"type":"address","name":"sender","internalType":"address"},{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"bytes","name":"userData","internalType":"bytes"},{"type":"bytes","name":"operatorData","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"owner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"postRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"},{"type":"bool","name":"success","internalType":"bool"},{"type":"uint256","name":"actualCharge","internalType":"uint256"},{"type":"bytes32","name":"preRetVal","internalType":"bytes32"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"preRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"relayHubVersion","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"removeDefaultOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renounceOwnership","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"revokeOperator","inputs":[{"type":"address","name":"operator","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"setDefaultRelayHub","inputs":[],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"subreddit","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"symbol","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"totalSupply","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transfer","inputs":[{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transferFrom","inputs":[{"type":"address","name":"sender","internalType":"address"},{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"transferOwnership","inputs":[{"type":"address","name":"newOwner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateDistributionContract","inputs":[{"type":"address","name":"distributionContract_","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateGSNApprover","inputs":[{"type":"address","name":"gsnApprover","internalType":"address"}],"constant":false}];
const subredditPointsContract = new web3.eth.Contract(subredditPointsABI, process.env.POINTS_CONTRACT);

const subscriptionsABI = [{"type":"event","name":"Canceled","inputs":[{"type":"address","name":"recipient","internalType":"address","indexed":true},{"type":"uint256","name":"expiresAt","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"DurationUpdated","inputs":[{"type":"uint256","name":"duration","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"type":"address","name":"previousOwner","internalType":"address","indexed":true},{"type":"address","name":"newOwner","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"PriceUpdated","inputs":[{"type":"uint256","name":"price","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"RelayHubChanged","inputs":[{"type":"address","name":"oldRelayHub","internalType":"address","indexed":true},{"type":"address","name":"newRelayHub","internalType":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RenewBeforeUpdated","inputs":[{"type":"uint256","name":"renewBefore","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"SignerUpdated","inputs":[{"type":"address","name":"signer","internalType":"address","indexed":false}],"anonymous":false},{"type":"event","name":"Subscribed","inputs":[{"type":"address","name":"recipient","internalType":"address","indexed":true},{"type":"address","name":"payer","internalType":"address","indexed":true},{"type":"uint256","name":"burnedPoints","internalType":"uint256","indexed":false},{"type":"uint256","name":"expiresAt","internalType":"uint256","indexed":false},{"type":"bool","name":"renewable","internalType":"bool","indexed":false}],"anonymous":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"},{"type":"bytes","name":"","internalType":"bytes"}],"name":"acceptRelayedCall","inputs":[{"type":"address","name":"relay","internalType":"address"},{"type":"address","name":"from","internalType":"address"},{"type":"bytes","name":"encodedFunction","internalType":"bytes"},{"type":"uint256","name":"transactionFee","internalType":"uint256"},{"type":"uint256","name":"gasPrice","internalType":"uint256"},{"type":"uint256","name":"gasLimit","internalType":"uint256"},{"type":"uint256","name":"nonce","internalType":"uint256"},{"type":"bytes","name":"approvalData","internalType":"bytes"},{"type":"uint256","name":"","internalType":"uint256"}],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"cancel","inputs":[{"type":"address","name":"recipient","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"duration","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"expiration","inputs":[{"type":"address","name":"account","internalType":"address"}],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"getHubAddr","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"owner_","internalType":"address"},{"type":"address","name":"gsnApprover","internalType":"address"},{"type":"address","name":"subredditPoints","internalType":"address"},{"type":"uint256","name":"price_","internalType":"uint256"},{"type":"uint256","name":"duration_","internalType":"uint256"},{"type":"uint256","name":"renewBefore_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"trustedSigner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"isOwner","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"owner","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"postRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"},{"type":"bool","name":"success","internalType":"bool"},{"type":"uint256","name":"actualCharge","internalType":"uint256"},{"type":"bytes32","name":"preRetVal","internalType":"bytes32"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"preRelayedCall","inputs":[{"type":"bytes","name":"context","internalType":"bytes"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"price","inputs":[],"constant":true},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"relayHubVersion","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renew","inputs":[{"type":"address","name":"recipient","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"renewBefore","inputs":[],"constant":true},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"renounceOwnership","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"setDefaultRelayHub","inputs":[],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"subscribe","inputs":[{"type":"address","name":"recipient","internalType":"address"},{"type":"bool","name":"renewable","internalType":"bool"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"transferOwnership","inputs":[{"type":"address","name":"newOwner","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateDuration","inputs":[{"type":"uint256","name":"duration_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateGSNApprover","inputs":[{"type":"address","name":"gsnApprover","internalType":"address"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updatePrice","inputs":[{"type":"uint256","name":"price_","internalType":"uint256"}],"constant":false},{"type":"function","stateMutability":"nonpayable","payable":false,"outputs":[],"name":"updateRenewBefore","inputs":[{"type":"uint256","name":"renewBefore_","internalType":"uint256"}],"constant":false}];
const subscriptionsContract = new web3.eth.Contract(subscriptionsABI, process.env.SUBSCRIPTIONS_CONTRACT);

const filepath = `${__dirname}/../data/users.csv`;
let users = [];

main();

async function main() {
  program.name("npm run recheck").usage("-- <options>");
  program.option('-t, --type <type>', 'transaction type. Possible values: claim, subscribe');
  program.option('-s, --start <number>', 'start index');
  program.option('-f, --finish <number>', 'end index');
  program.parse(process.argv);

  if (['claim', 'subscribe'].indexOf(program.type) < 0) {
    program.help();
  }

  const start = parseInt(program.start);
  if (isNaN(start) || start < 0) {
    program.help();
  }

  const finish = parseInt(program.finish);
  if (isNaN(finish) || finish <= 0) {
    program.help();
  }

  csvLoad();

  for (let i = start; i <= finish; i++) {
    log(`Check ${i}...`);

    const account = users[i].split(',')[0];

    if (program.type === 'claim') {
      if ('0' === await subredditPointsContract.methods.balanceOf(account).call()) {
        setUserClaimed(i, false);
      } else {
        setUserClaimed(i, true);
      }
    } else if (program.type === 'subscribe') {
      if ('0' === await subscriptionsContract.methods.expiration(account).call()) {
        setUserSubscribed(i, false);
      } else {
        setUserSubscribed(i, true);
      }
    }
  }

  printFlags();
  
  csvSave();
}

function user(userIndex) {
  const user = users[userIndex].split(',');
  return {
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

function _setTxStatus(userIndex, status, columnIndex) {
  let user = users[userIndex].split(',');
  user[columnIndex] = status ? 'Y' : '';
  users[userIndex] = user.join(',');
}

function csvLoad() {
  log('Reading CSV...', true);
  users = fs.readFileSync(filepath, 'utf8').split('\n');
}

async function csvSave() {
  log('Saving CSV...', true);
  fs.writeFileSync(filepath, users.join('\n'), 'utf8');
}

function log(message, emptyPreLine) {
  if (emptyPreLine) {
    console.log('');
  }
  console.log(message);
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
