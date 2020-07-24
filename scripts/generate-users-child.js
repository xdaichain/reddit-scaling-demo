require('dotenv').config();

const assert = require('assert');
const constants = require('./constants');
const Web3 = require('web3');
const web3 = new Web3();

process.on('message', async (task) => {
  let results = [];
  const subredditLowerCase = process.env.SUBREDDIT.toLowerCase();
  const karmaSourcePrivateKey = process.env.KARMA_SOURCE_KEY;
  for (let i = task.start; i < task.end; i++) {
    let line = task.lines[i].split(',');
    const account = line[0];

    let karma;
    if (i < constants.TOTAL_SUBSCRIBE_TRANSACTIONS) {
      karma = randomInt(270, 400+1); // karma = 270...400
    } else {
      karma = randomInt(150, 200+1); // karma = 150...200
    }

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

    results.push(`${karma},${signature.signature}`);
  }
  process.send({ i: task.i, results });
});

function randomInt(min, max) {
  return min + Math.floor((max - min) * Math.random());
}
