require('dotenv').config();

const assert = require('assert');
const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3(process.env.RPC);

web3.eth.transactionBlockTimeout = 20;
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.transactionPollingTimeout = 300;

let users = [];

main();

async function main() {
  console.log('Performing `claim` transactions...');

  console.log('  Reading CSV...');
  const filepath = `${__dirname}/../users.csv`;
  users = fs.readFileSync(filepath, 'utf8').split('\n');

  const onePassTxLimit = 100;
  const limitPasses = 10; // 0 for unlimited passes
  const maxClaimUsers = users.length;
  
  let txs = [];
  let passesPerformed = 0;

  for (let i = 0; i < maxClaimUsers; i++) {
    const { account, privateKey, karma, signature, claimTx, claimed } = parseUser(users[i].split(','));

    if (!claimed) {
      txs.push({ i, claimTx });
    }

    if (txs.length >= onePassTxLimit || i == maxClaimUsers - 1) {
      // Send transactions and wait them to be mined
      console.log(`  Sending ${txs.length} transactions...`);
      let txPromises = [];
      for (let t = 0; t < txs.length; t++) {
        txPromises.push(web3.eth.sendSignedTransaction(txs[t].claimTx));
      }
      console.log(`  Waiting for mining...`);
      const txReceipts = await Promise.all(txPromises);
      console.log(`  Mined`);
      console.log();
      for (let t = 0; t < txs.length; t++) {
        setUserClaimed(txs[t].i, txReceipts[t].status);
      }
      txs = [];
      fs.writeFileSync(filepath, users.join('\n'), 'utf8');

      passesPerformed++;

      if (limitPasses > 0 && passesPerformed >= limitPasses) {
        break;
      }
    }
  }
}

function parseUser(user) {
  return {
    account: user[0],
    privateKey: user[1],
    karma: user[2],
    signature: user[3],
    claimTx: user[4],
    claimed: user[5] === 'Y'
  }
}

function setUserClaimed(userIndex, claimed) {
  let user = users[userIndex].split(',');
  user[5] = claimed ? 'Y' : 'N';
  users[userIndex] = user.join(',');
}
