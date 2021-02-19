require('dotenv').config();

const assert = require('assert');
const envfile = require('envfile');
const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3');
const net = require('net');
const web3 = new Web3(process.env.IPC ? new Web3.providers.IpcProvider(process.env.IPC, net) : process.env.RPC);
const BN = web3.utils.BN;

const ownerAccount = web3.eth.accounts.privateKeyToAccount(process.env.OWNER_KEY);
const owner = ownerAccount.address;

web3.eth.transactionBlockTimeout = 20;
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.transactionPollingTimeout = 300;

main();

async function main() {
  // Calc totalKarma from the CSV
  const totalKarma = getTotalKarma();
  assert(totalKarma > 0, 'Total karma should be positive');

  // Deploy Reddit contracts
  const pointsContract = await deploy('SubredditPoints_v0');
  const distributionsContract = await deploy('Distributions_v0');
  const subscriptionsContract = await deploy('Subscriptions_v0');

  // Save proxy addresses to `.env` file
  const envFilePath = `${__dirname}/../.env`;
  let env = envfile.parse(fs.readFileSync(envFilePath, 'utf8'));
  env.POINTS_CONTRACT = pointsContract.options.address;
  env.DISTRIBUTIONS_CONTRACT = distributionsContract.options.address;
  env.SUBSCRIPTIONS_CONTRACT = subscriptionsContract.options.address;
  fs.writeFileSync(envFilePath, envfile.stringify(env), 'utf8');

  // Initialization
  console.log('Initialize SubredditPoints...');
  await signAndSend(pointsContract.methods.initialize(
    owner,
    env.GSN_APPROVER,
    env.DISTRIBUTIONS_CONTRACT,
    env.SUBREDDIT,
    env.NAME,
    env.SYMBOL,
    [env.SUBSCRIPTIONS_CONTRACT]
  ), env.POINTS_CONTRACT);

  console.log('Initialize Distributions...');
  await signAndSend(distributionsContract.methods.initialize(
    owner,
    env.POINTS_CONTRACT,
    env.KARMA_SOURCE,
    env.GSN_APPROVER,
    web3.utils.toWei('50000000'), // initialSupply
    web3.utils.toWei('5000000'),  // nextSupply
    totalKarma, // initialKarma
    6, // roundsBeforeExpiration
    25000, [ // supplyDecayPercent
      env.SHARED_OWNER_REDDIT,
      env.SHARED_OWNER_RESERVE,
      env.SHARED_OWNER_MODERATORS
    ], [
      200000, // 20% to Reddit
      200000, // 20% to Reserve
      100000  // 10% to Moderators
    ]
  ), env.DISTRIBUTIONS_CONTRACT);

  console.log('Initialize Subscriptions...');
  await signAndSend(subscriptionsContract.methods.initialize(
    owner,
    env.GSN_APPROVER,
    env.POINTS_CONTRACT,
    web3.utils.toWei('100'), // price, decreased from 1000 in testing purposes
    2678400, // duration (31 days in seconds)
    2678400  // renewBefore (31 days in seconds), increased from 48 hours in testing pusposes
  ), env.SUBSCRIPTIONS_CONTRACT);

  process.exit();
}

async function compile(dir, contractName) {
  const input = {
    language: 'Solidity',
    sources: {
      '': {
        content: fs.readFileSync(dir + contractName + '.sol').toString()
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        '*': {
          '*': [ 'abi', 'evm.bytecode.object' ]
        }
      }
    }
  }

  const compiled = JSON.parse(solc.compile(JSON.stringify(input), function(path) {
    let content;
    try {
      content = fs.readFileSync(dir + path);
    } catch (e) {
      if (e.code == 'ENOENT') {
        try {
          content = fs.readFileSync(dir + '../' + path);
        } catch (e) {
          content = fs.readFileSync(dir + '../node_modules/' + path);
        }
      }
    }
    return {
      contents: content.toString()
    }
  }));

  const result = compiled.contracts[''][contractName];

  return {abi: result.abi, bytecode: result.evm.bytecode.object};
}

async function deploy(contractName) {
  console.log(`Deploying ${contractName} contract...`);
  const implementation = await signAndDeploy(contractName);
  console.log(`  Implementation address: ${implementation.options.address}`);

  const proxyContractName = 'AdminUpgradeabilityProxy';
  const proxy = await signAndDeploy(proxyContractName, [
    implementation.options.address, // implementation address
    process.env.PROXY_ADMIN, // proxy admin
    []
  ]);

  const admin = await proxy.methods.admin().call({ from: process.env.PROXY_ADMIN });
  assert(admin == process.env.PROXY_ADMIN, `admin() does not match PROXY_ADMIN. admin(): ${admin}, PROXY_ADMIN: ${process.env.PROXY_ADMIN}`);

  const impl = await proxy.methods.implementation().call({ from: process.env.PROXY_ADMIN });
  assert(impl == implementation.options.address, `implementation() returns incorrect address. implementation(): ${impl}, implementation.options.address = ${implementation.options.address}`);

  console.log(`  Proxy address: ${proxy.options.address}`);

  return new web3.eth.Contract(
    implementation.options.jsonInterface,
    proxy.options.address
  );
}

async function signAndDeploy(contractName, constructorArguments) {
  console.log(`  Compiling...`);
  const compiled = await compile(`${__dirname}/../contracts/`, contractName);

  console.log(`  Waiting for TX to be mined...`);
  const contract = new web3.eth.Contract(compiled.abi);
  const deployObj = contract.deploy({
    data: compiled.bytecode,
    arguments: constructorArguments
  });
  const receipt = await signAndSend(deployObj);

  return new web3.eth.Contract(compiled.abi, receipt.contractAddress);
}

async function signAndSend(method, to) {
  const gasPrice = web3.utils.toWei(process.env.GAS_PRICE || '0', 'gwei');

  const estimateGas = await method.estimateGas({
    from: owner,
    gasPrice
  });

  const signedTxData = await ownerAccount.signTransaction({
    to,
    data: method.encodeABI(),
    gasPrice,
    gas: Math.trunc(estimateGas * 1.2)
  });

  const receipt = await web3.eth.sendSignedTransaction(
    signedTxData.rawTransaction
  );

  if (receipt.hasOwnProperty('status')) {
    assert(receipt.status === true || receipt.status === '0x1', `Unrecognized receipt status: ${receipt.status}`);
  } else {
    assert(receipt.logs.length > 0 || receipt.contractAddress, `Receipt status is unknown. receipt.logs.length = ${receipt.logs.length}, receipt.contractAddress = ${receipt.contractAddress}`);
  }

  return receipt;
}

function getTotalKarma() {
  let totalKarma = 0;
  const lines = fs.readFileSync(`${__dirname}/../data/users.csv`, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].split(',');
    const karma = line[2] - 0;
    totalKarma += karma;
  }
  return totalKarma;
}
