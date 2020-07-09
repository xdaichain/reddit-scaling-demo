require('dotenv').config();

const assert = require('assert');
const constants = require('./constants');
const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3(process.env.RPC);

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
    const acc = web3.eth.accounts.create();
    const line = `${acc.address},${acc.privateKey}`;
    const nonce = await web3.eth.getTransactionCount(acc.address);
    if (nonce === 0 && !addressGenerated.hasOwnProperty(acc.address)) {
      lines.push(line);
      addressGenerated[acc.address] = true;
      console.log(`  Progress: ${lines.length}/${totalAddresses}`);
    }
    if (lines.length % (totalAddresses / 1000) === 0) {
      fs.writeFileSync(tmpFilepath, lines.join('\n'), 'utf8');
    }
  }
  delete addressGenerated;
  fs.unlinkSync(tmpFilepath);

  console.log('Add signatures and random karma for `claim`...');
  let totalKarma = 0;
  const subredditLowerCase = subreddit.toLowerCase();
  for (let i = 0; i < totalAddresses; i++) {
    let line = lines[i].split(',');
    const account = line[0];

    let karma;
    if (i < subscribes) {
      karma = randomInt(270, 400+1); // karma = 270...400
    } else {
      karma = randomInt(150, 200+1); // karma = 150...200
    }
    totalKarma += karma;

    const message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
      ['string', 'uint256', 'address', 'uint256'], [
        subredditLowerCase,
        0, // round
        account,
        karma
      ]
    ));

    const signature = web3.eth.accounts.sign(message, karmaSourcePrivateKey);

    assert(signature.signature.startsWith('0x'));
    assert(signature.signature.length == 65*2+2);
    assert((new web3.utils.BN(signature.s)).lte(new web3.utils.BN('0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0')));
    assert(web3.utils.hexToNumber(signature.v) === 27 || web3.utils.hexToNumber(signature.v) === 28);

    lines[i] = `${lines[i]},${karma},${signature.signature}`; // append csv columns

    console.log(`  Progress: ${i+1}/${lines.length}`);
  }
  let minUserPoints1 = availablePoints;
  let minUserPoints2 = availablePoints;
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
}

function randomInt(min, max) {
  return min + Math.floor((max - min) * Math.random());
}
