# Reddit scaling demo

The smart contracts and scripts in this repo load and simulate transactions on the xDai sidechain pertaining to the [Reddit scaling competition](https://www.reddit.com/r/ethereum/comments/hbjx25/the_great_reddit_scaling_bakeoff/).

_Note: For instructions on using dockerized commands listed below, please see https://github.com/xdaichain/reddit-scaling-demo/tree/docker-compose#readme_

There are four smart contracts representing a single subreddit in the `contracts` directory. The demo demonstrates the load of one subreddit.
- `SubredditPoints_v0`. The subreddit points contract implementation.
- `Distributions_v0`. The distribution contract implementation.
- `Subscriptions_v0`. The subscriptions contract implementation.
- `AdminUpgradeabilityProxy`. A proxy contract deployed once for each contract implementation (SubredditPoints, Distributions, Subscriptions). This allows for contract updates by a Proxy Admin as needed to change or upgrade the code.

In addition, there are several scripts in the `scripts` directory which automate certain tasks as follows:

1. Generate `100,000` unique addresses (emulating Reddit users).

2. Deploy and initialize Reddit smart contracts (SubredditPoints, Distributions, Subscriptions) to the chain.

3. Generate transactions to the contracts needed for the demo:
    - `100,000` calls to the [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) function.
    - `25,000` calls to the [`Subscriptions.subscribe`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1867) function.
    - `75,000` calls to the [`SubredditPoints.burn`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1640) function.
    - `100,000` calls to the [`SubredditPoints.transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L397) function.

    All transactions will be performed with a zero gas price, so users don't need to have positive balances on the xDai chain.

4. Perform the generated calls loading the chain.

This repo should used on a machine with at least 1Gb of free RAM. The scripts require sufficient RAM to handle a large CSV file containing the list of users (addresses and private keys) and their prepared transactions. To maintain simplicity, we did not implement a working DB for this demo. 


## Step 1. Configure and prepare admin and owner keys and addresses

First, we need to configure the root `.env` file. Copy `example.env` to `.env` in the root directory:

```bash
$ cp example.env .env
```

Edit the `.env` file and fill in the following variables:

- `RPC` - points to the chain RPC URL. It is set to `https://dai.poa.network` by default.
- `IPC` - points to the local IPC path. It is used instead of RPC if not empty.
- `PROXY_ADMIN` - Proxy Admin address used when deploying upgradable Reddit contracts (passed to the constructor of the `AdminUpgradeabilityProxy` contract). This address won't be used during testing but the key should be known if we decide to change something in the Reddit contracts (their implementations).
- `OWNER` - account which deploys and initializes all the contracts. The owner has rights to call some functions in `SubredditPoints, Distributions, Subscriptions` and change configurations.
- `OWNER_KEY` -  `OWNER`'s private key.
- `GSN_APPROVER` - Gas Station Network account (if used). It is passed to the contracts during initialization. We will not use GSN in the demo.
- `KARMA_SOURCE` - Karma source provider address. Signs token claims and is used by the `Distributions` contract to check `claim` signatures and start a new monthly round. Matches the `GSN_APPROVER`.
- `KARMA_SOURCE_KEY` - `KARMA_SOURCE` private key.
- `SHARED_OWNER_REDDIT` - account representing Reddit's shared owner (receives 20% of tokens when starting a new round).
- `SHARED_OWNER_RESERVE` - account representing a reserve (receives 20% of tokens when starting a new round).
- `SHARED_OWNER_MODERATORS` - account representing moderators (receives 10% of tokens when starting a new round).
- `SUBREDDIT` - subreddit name served by these contracts. `TestSubreddit` by default.
- `NAME` - subreddit points token name. `TESTMOON` by default.
- `SYMBOL` - subreddit points token symbol. `TMOON` by default.
- `POINTS_CONTRACT` -  `SubredditPoints` proxy contract address. Should be left empty as it will be filled (rewritten) automatically by deployment script.
- `DISTRIBUTIONS_CONTRACT` - `Distributions` proxy contract address. Should be left empty as it will be filled (rewritten) automatically by deployment script.
- `SUBSCRIPTIONS_CONTRACT` - `Subscriptions` proxy contract address. Should be left empty as it will be filled (rewritten) automatically by deployment script.

## Step 2. Generate user addresses

Run the following command:

```bash
$ npm run generate-users
```

This creates a `users.csv` file in the `data` directory with `100,000` rows and the following columns (comma separated):

```
account,privateKey,karma,signature
```

Karma of each user is generated randomly within a 150 to 400 range. The `signature` column contains a signature created by the `KARMA_SOURCE` address. These fields are needed to call the [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) function in `Step 6`.

This step may take some time as it checks a `nonce` for each generated address (and sends the corresponding `eth_getTransactionCount` JSON RPC). If the script is interrupted (intentionally or due to a disconnection), it can be restarted and the generation process will continue from the previous known point.

## Step 3. Deploy and initialize smart contracts

Run the following command:

```bash
$ npm run deploy
```

This will deploy and initialize the contracts and write their proxy addresses to the `.env` file (into the `POINTS_CONTRACT`, `DISTRIBUTIONS_CONTRACT`, `SUBSCRIPTIONS_CONTRACT` variables). During contracts initialization, this script will read the `karma` column of the `users.csv` to get total karma and pass it to the [`Distributions.initialize`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1887) function.

Note that the SubredditPoints contract has a [`decimals()`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1762-L1764) public getter returning 18, meaning that the test points (tokens) have 18 decimals like Ethereum.

## Step 4. Enable zero gas price on the xDai chain

_The scripts contained in this repo can be used on another xDai-like chain which has zero gas price transactions enabled by default (for example, the test `qDai` chain). Skip this step in this case._

To allow zero gas price transactions to the listed functions of the Reddit smart contracts on the xDai chain, we need to modify the corresponding rules in the [`TxPermission`](https://github.com/poanetwork/posdao-contracts/blob/master/contracts/TxPermission.sol) contract (and then switch [TxPermission proxy](https://github.com/poanetwork/poa-chain-spec/blob/55d94e928ab942bcdc77cdf3936245492272c10a/spec.json#L57) to the modified implementation by POSDAO owner address). Example of the corresponding `TxPermission` implementation modification: https://github.com/poanetwork/posdao-contracts/commit/f47ab5b6cf1103e3c47d1c98adb056361dcc0e7a

Also, POSDAO owner should add the `OWNER` account to the `Certifier` contract using the [`Certifier.certify`](https://github.com/poanetwork/posdao-contracts/blob/229d6441ae32fd4250884e1c8d53f7fec10a9e9e/contracts/Certifier.sol#L62-L67) on the xDai chain to allow a zero gas price for Reddit contract deployment.

## Step 5. Generate load transactions

Run the following command:

```bash
$ npm run generate-txs
```

The generator script will append the `users.csv` file with the following columns (comma separated):

```
...,claimTx,subscribeTx,burnTx,transferTx
```

After this command is performed, the `users.csv` file will include the following columns (and `100,000` rows):

```
account,privateKey,karma,signature,claimTx,subscribeTx,burnTx,transferTx
```

- `claimTx` represents a call to the [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) function. The `round` parameter of the call is set to `0` assuming we're on the very first round.
- `subscribeTx` represents a call to the [`Subscriptions.subscribe`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1867) function (with `renewable` argument set to `true`).
- `burnTx` represents a call to the [`SubredditPoints.burn`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1640) function (with `amount` argument set to 10 tokens (10 * 10^18 wei)).
- `transferTx` represents a call to the[`SubredditPoints.transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L397) function. The `recipient` argument is set so that the first 50000 users send 1 token (1 * 10^18 wei) to the remaining 50000 users, and vice versa.

Each transaction is signed by the `privateKey` of the corresponding user (taken from the same row). The `nonce` of each transaction is set statically and starts from `0` for each address.

After this step, the `users.csv` file will be approximately 170 Mb.

## Step 6. Send load transactions

To launch a script for sending the generated transactions, there is `npm run load` command which accepts CLI options:

```
Usage: npm run load -- <options>

Options:
  -t, --type <type>           transaction type. Possible values: claim, subscribe, burn, transfer
  -p, --passes <number>       how many passes to perform. 0 for unlimited (default: 1)
  -l, --tx-limit <number>     how many transactions per one pass (default: 1)
  -i, --interval <number>     seconds between passes (default: 5)
  -q, --queue-limit <number>  receipt queue max size. 0 to ignore receipts (default: 200)
  -o, --offset <number>       starting position in users.csv (default: 0)
  -s, --stat                  shows how many txs of each type were sent (calculates Y/N flags from users.csv)
  -h, --help                  display help for command
```

The load script can perform each of four types of transactions written to `users.csv`. When running the script, it only performs transactions of a certain `--type` per the run.

To limit the load by a specified number of transactions, there are several options: `--passes`, `--tx-limit`, and `--interval`.

For example, to perform 1000 `claim` transactions and split them by 10 passes with 100 txs each per 5 seconds (this will help keep the transaction queue on the chain clear) run the following:

```bash
$ npm run load -- --type=claim --passes=10 --tx-limit=100 --interval=5
```

The script will not send transactions from the next pass until all transactions from the current pass are sent to the chain. So, we can relaunch the script with different `--tx-limit` parameters to regulate the load.

While the script works, transaction results are written to `users.csv` into a separate column and the current performance information is displayed in the console. For example:

```
...
2020-07-07 13:32:26 UTC Sending 50 'subscribe' transaction(s)...

2020-07-07 13:32:27 UTC Current stat: 751 succeeded, 0 reverted, 0 failed
2020-07-07 13:32:27 UTC Receipt queue size: 149
2020-07-07 13:32:27 UTC Total sent: 900
2020-07-07 13:32:27 UTC Sending progress: 90%
2020-07-07 13:32:27 UTC Receipts progress: 83%
2020-07-07 13:32:27 UTC Cumulative performance: 42.84 txs/sec

2020-07-07 13:32:27 UTC Sending 50 'subscribe' transaction(s)...

2020-07-07 13:32:28 UTC Current stat: 801 succeeded, 0 reverted, 0 failed
2020-07-07 13:32:28 UTC Receipt queue size: 149
2020-07-07 13:32:28 UTC Total sent: 950
2020-07-07 13:32:28 UTC Sending progress: 95%
2020-07-07 13:32:28 UTC Receipts progress: 84%
2020-07-07 13:32:28 UTC Cumulative performance: 42.15 txs/sec
...
```

There are four columns appended to the CSV by the load script, one column for each transaction type:

```
claimed,subscribed,burned,transferred
```

Each column can have an empty value or a boolean value of `Y` or `N`. For example, `Y` in the `claimed` column means that the corresponding [`claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) transaction was successful, and `N` means that the transaction reverted. An empty value means that the corresponding transaction hasn't been sent yet (hasn't been handled by the load script).

For the specified `--type` the load script ignores the rows in `users.csv` which has already been set to `Y` or `N` for the corresponding column, and continues to send transactions for the rows that have an empty value for the corresponding column. That way, the load script can be launched several times (until it fills the corresponding column for all rows).

Stop the transaction script with `CTRL+C` or through `SIGINT` signal with the `kill -2 <pid>` command if needed: in this case, it completes sending the latest batch of transactions, waits until the receipt queue is fully handled, then terminates. This is the safest way to stop the script.

If you need to stop the load script completely, try `CTRL+C` twice or send `SIGTERM` signal with the `kill -15 <pid>` command: it will complete sending the latest batch of transactions, interrupt receipt queue handling, save the latest known transaction results to the CSV file, then terminate. Note that it won't write the transaction results from the remaining queue to the CSV, so SIGTERM may result in some lost tx results.

Load transactions should be performed in the following order (because the prepared transactions in `users.csv` are signed with an explicit `nonce` which is defined based on the order):
- claim
- subscribe
- burn
- transfer

This means that in the demo, users first claim tokens, then a subset of users subscribes to subreddit membership, a percentage burn their tokens, and finally users transfer tokens to each other.

### Methods of sending transactions

There are two approaches to send transactions using the load script:

**1. Send a batch of transactions to the chain and wait for receipts.**

This method is turned on by default (when `--queue-limit` CLI option is set to a non-zero value). It is used for the xDai chain with 5-seconds blocks.

The load script reads transactions in chunks (size is defined by `--tx-limit` CLI option) from the `users.csv` and sends them to the chain using the [`web3.eth.sendSignedTransaction`](https://web3js.readthedocs.io/en/v1.2.9/web3-eth.html#sendsignedtransaction) function. It occurs every `--interval` seconds until the number of `--passes` is reached or `SIGINT` signal is received.

A promise returned by the `web3.eth.sendSignedTransaction` is added to a queue and the queue is handled by a separate thread so it doesn't delay the main thread where sending occurs. The `--queue-limit` defines the maximum size of the queue: if it's reached, the main thread is paused until the queue size is reduced below the limit. This prevents a scenario where the RPC/IPC delays its response for some reason (or when a promise reaches a timeout) and causes the queue to grow uncontrollably.

When the transaction's promise is resolved, it returns a receipt with a result which is handled by the script and the transaction is marked as `Y` or `N` in the corresponding CSV column (see above).

This method receives transaction receipts then records transaction results into the CSV.

Initially, the load script handled transaction results in the main thread (right after being sent to the chain), but sending delays occured due to the time needed for receipts receiving and handling. Transactions were not sent every block, but often every other block. Currently, the script uses the separate thread to work with transaction receipts.

**2. Send a batch of transactions to the chain without waiting for their results.**

This method is activated when `--queue-limit` CLI option is set to zero and is used for `qDai` chain where blocks are produced every second.

Since there is a very small amount of time between blocks, we skip receipts handling for the transactions. The RPC can significantly delay responses due to a large amount of transactions per second.

As with the first approach, the load script reads transactions in chunks (which size is defined by `--tx-limit` CLI option) from the `users.csv` and sends them to the chain using `eth_sendRawTransaction` JSON RPC request directly (without using web3's `sendSignedTransaction`). This occurs every `--interval` seconds (1 second in case of `qDai`) until the number of `--passes` is reached or `SIGINT` signal is received.

This approach only uses one thread (which only sends transactions and doesn't receive receipts). After a transaction is sent to the chain, the script immediately marks it as `Y` in the corresponding column in the CSV.

With this approach we send the `eth_sendRawTransaction` request directly rather than `web3.eth.sendSignedTransaction` despite the fact that both send the same information. The difference is that `web3.eth.sendSignedTransaction` contains many handlers and consumes a good deal of CPU/RAM when there are a lot of transactions (and it waits for the transaction hash before marking the sent transaction as `sent`, using resources allocated for tx sending).

To directly send `eth_sendRawTransaction`, we use an embedded `http` module of `Node.js`(if IPC is not used), or a socket connection (if IPC is used). This allows us to send a request without waiting for the response (we call the [`socket.end()`](https://nodejs.org/docs/latest-v8.x/api/net.html#net_socket_end_data_encoding) function). `eth_sendRawTransaction` is sent [wrapped to a promise](https://github.com/xdaichain/reddit-scaling-demo/blob/28034feb9f0438aa208bcb572b2fdfc9d7623023/scripts/load.js#L218-L230) which resolves as soon as the request is written to the chain.

## Emitted events

Each transaction emits the corresponding event:
- [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) emits the [`ClaimPoints`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1951) event.
- [`Subscriptions.subscribe`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1867) emits the [`Subscribed`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1885) event.
- [`SubredditPoints.burn`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1640) emits the [`Burned`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1747) and [`Transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L531) events. For `Transfer` event, the `to` argument is set to `address(0)`.
- [`SubredditPoints.transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L397) emits the [`Transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L495) event with `to` set to non-zero address.

All transactions and events can be examined using our [Blockscout](http://blockscout.com/) explorer.
