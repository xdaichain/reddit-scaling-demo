require('dotenv').config();

const envfile = require('envfile');
const { program } = require('commander');
const solc = require('solc');
const Web3 = require('web3');
const fs = require('fs');
const net = require('net');
const web3 = new Web3(process.env.IPC ? new Web3.providers.IpcProvider(process.env.IPC, net) : process.env.RPC);
const BN = web3.utils.BN;

const multisenderAccount = web3.eth.accounts.privateKeyToAccount(process.env.MULTISENDER_KEY);
const multisender = multisenderAccount.address;

web3.eth.accounts.wallet.add(multisenderAccount);

web3.eth.transactionBlockTimeout = 20;
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.transactionPollingTimeout = 300;

const csvFilepath = `${__dirname}/../data/users.csv`;
let amount = 0;
let batch = 100;
let users = [];
let userBalances = [];

main();

async function main() {
  program.name("npm run multisend").usage("-- <options>");
  program.option('-a, --amount [amount]', 'amount of coins for one address. 0 to detect automatically', amount);
  program.option('-b, --batch [size]', 'batch size', batch);
  program.parse(process.argv);

  amount = parseFloat(program.amount.toString().replace(',', '.'));
  if (isNaN(amount) || amount < 0) {
    program.help();
  }

  batch = parseInt(program.batch);
  if (isNaN(batch) || batch < 0) {
    program.help();
  }

  if (!process.env.GAS_PRICE) {
    log('GAS_PRICE is zero or not defined');
    exit(1);
  }

  csvLoad();

  if (amount == 0) {
    amount = 0.00043 * process.env.GAS_PRICE;
  }

  // Compile Multisender contract
  const compiled = await compile(`${__dirname}/../contracts/`, 'Multisender');
  const contract = new web3.eth.Contract(compiled.abi);
  const deploy = contract.deploy({ data: compiled.bytecode });
  const deployEstimateGas = await deploy.estimateGas({
    from: multisender,
    gasPrice: web3.utils.toWei(process.env.GAS_PRICE, 'gwei')
  });

  // Calculate minimum balance for the multisender account
  const totalAmount = web3.utils.toWei((amount * 2 * users.length).toString());
  let deployAmount = '0';
  if (!process.env.MULTISENDER_CONTRACT) {
    deployAmount = web3.utils.toWei((deployEstimateGas * process.env.GAS_PRICE).toString(), 'gwei');
  }
  let minMultisenderBalanceNeeded = (new BN(totalAmount)).add(new BN(deployAmount)); // in wei

  // Get user balances
  log('Get user balances...');
  let promises = [];
  let batchReq = new web3.BatchRequest();
  for (let i = 0; i < users.length; i++) {
    promises.push(new Promise((resolve, reject) => {
      batchReq.add(web3.eth.getBalance.request(user(i).account, 'latest', (err, balance) => {
        if (err) reject(err);
        else resolve({ i, balance });
      }));
    }));
    if (promises.length >= 1000 || i == users.length - 1) {
      await batchReq.execute();
      const results = await Promise.all(promises);
      for (let r = 0; r < results.length; r++) {
        userBalances[results[r].i] = new BN(results[r].balance);
      }
      promises = [];
      batchReq = new web3.BatchRequest();
      log(`  Progress: ${i + 1}/${users.length} [${Math.floor((i + 1) / users.length * 100)}%]`);
    }
  }

  const amountWei = new BN(web3.utils.toWei(amount.toString()));
  for (let i = 0; i < userBalances.length; i++) {
    if (userBalances[i].gte(amountWei)) {
      minMultisenderBalanceNeeded = minMultisenderBalanceNeeded.sub(amountWei.mul(new BN(2)));
    }
  }

  const multisenderBalance = new BN(await web3.eth.getBalance(multisender));

  log(`Multisender account should have at least ${web3.utils.fromWei(minMultisenderBalanceNeeded)} coins on its balance`);
  log(`Currently it has ${web3.utils.fromWei(multisenderBalance)} coins`);

  if (multisenderBalance.lt(minMultisenderBalanceNeeded)) {
    log(`Insufficient funds`);
    return;
  }

  let multisenderContract;
  if (!process.env.MULTISENDER_CONTRACT) {
    log('Deploying Multisender contract...');
    multisenderContract = await deploy.send({ from: multisender, gas: deployEstimateGas, gasPrice: web3.utils.toWei(process.env.GAS_PRICE, 'gwei') });
    log(`  Done. Contract address: ${multisenderContract.options.address}`);

    // Save proxy addresses to `.env` file
    const envFilePath = `${__dirname}/../.env`;
    let env = envfile.parse(fs.readFileSync(envFilePath, 'utf8'));
    env.MULTISENDER_CONTRACT = multisenderContract.options.address;
    fs.writeFileSync(envFilePath, envfile.stringify(env), 'utf8');
  } else {
    log(`Using existing Multisender contract (${process.env.MULTISENDER_CONTRACT})`);
    multisenderContract = new web3.eth.Contract(compiled.abi, process.env.MULTISENDER_CONTRACT);
  }

  log(`Sending coins...`);
  let receivers = [];
  for (let i = 0; i < userBalances.length; i++) {
    if (userBalances[i].lt(amountWei)) {
      receivers.push(user(i).account);
    }
    if (receivers.length >= batch || i == userBalances.length - 1) {
      const value = amountWei.mul(new BN(receivers.length));
      const method = multisenderContract.methods.multisend(receivers);

      const gas = await method.estimateGas({
        from: multisender,
        gasPrice: web3.utils.toWei(process.env.GAS_PRICE, 'gwei'),
        value
      });

      const receipt = await method.send({
        from: multisender,
        gasPrice: web3.utils.toWei(process.env.GAS_PRICE, 'gwei'),
        gas: Math.round(gas * 1.2),
        value
      });

      if (receipt.status) {
        log(`  Tx ${receipt.transactionHash} succeeded. cumulativeGasUsed = ${receipt.cumulativeGasUsed}. ${web3.utils.fromWei(value)} coins have been sent totally to ${receivers.length} addresses`);
        log(`  Progress: ${i + 1}/${userBalances.length} [${Math.floor((i + 1) / userBalances.length * 100)}%]`);
      } else {
        log(`  Tx ${receipt.transactionHash} failed`);
        break;
      }

      receivers = [];
    }
  }
}

function user(userIndex) {
  const user = users[userIndex].split(',');
  return {
    account: user[0]
  }
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

function csvLoad() {
  log('Loading CSV...', true);
  users = fs.readFileSync(csvFilepath, 'utf8').split('\n');
  for (let i = 0; i < users.length; i++) {
    userBalances[i] = new BN(0);
  }
  log('CSV loaded');
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
  const line = `${time} ${message}`;
  console.log(line);
}
