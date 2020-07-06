# Reddit scaling demo

This repo contains smart contracts and scripts for demo of loading the xDai sidechain by transactions within [Reddit scaling competition](https://www.reddit.com/r/ethereum/comments/hbjx25/the_great_reddit_scaling_bakeoff/).

There are four smart contracts representing a subreddit in the `contracts` directory. This demo assumes we only demonstrate the load to one subreddit.
- `SubredditPoints_v0`. The implementation for the subreddit points contract.
- `Distributions_v0`. The implementation for the distribution contract.
- `Subscriptions_v0`. The implementation for the subscriptions contract.
- `AdminUpgradeabilityProxy`. This is a proxy contract deployed once for each of SubredditPoints, Distributions, Subscriptions implementation. Allows to upgrade implementation of each of these contracts by Proxy Admin when we need to change or fix something in the code.

Also, there are a few scripts in the `scripts` directory which allow to:

1. Generate `100,000` unique addresses (emulating Reddit users).

2. Deploy Reddit smart contracts (SubredditPoints, Distributions, Subscriptions) to the chain and initialize them.

3. Generate transactions to the contracts needed for the demo:
    - `100,000` calls to [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) function
    - `25,000` calls to [`Subscriptions.subscribe`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1867) function
    - `75,000` calls to [`SubredditPoints.burn`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1640) function
    - `100,000` calls to [`SubredditPoints.transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L397) function

    All the transactions will be performed with zero gas price, so the users don't need to have positive balances on xDai chain.

4. Perform the generated calls loading the chain.

This repo can be used on a machine having at least 1Gb free RAM since the scripts require big enough RAM to handle a big CSV file containing the list of users (addresses and private keys) and their prepared transactions. We didn't implement working with DB for this demo for simplicity.

First, we need to do some configs in `.env` file.

## Step 1. Configuration: prepare admins and owner keys and addresses

Copy `example.env` to `.env` being in the root of the repo:

```bash
$ cp example.env .env
```

Edit `.env` file filling the following variables:

- `RPC` - points to the RPC URL of the chain. `https://dai.poa.network` by default.
- `PROXY_ADMIN` - the Proxy Admin address which is used when deploying the upgradable Reddit contracts (passed to the constructor of the `AdminUpgradeabilityProxy` contract). This address won't be used while testing but it's key should be known for the case if we decide to change something in the Reddit contracts (their implementations).
- `OWNER` - the account which deploys and initializes all the contracts. Has rights to call some functions in `SubredditPoints, Distributions, Subscriptions` to change configurations.
- `OWNER_KEY` - the private key of the `OWNER`.
- `GSN_APPROVER` - the account which would be used for Gas Station Network. Passed to the contracts when initialization, but we don't use GSN in this demo.
- `KARMA_SOURCE` - Karma source provider address. Signs token claims and used by the `Distributions` contract to check the `claim` signatures and to start a new monthly round. Matches the `GSN_APPROVER`.
- `KARMA_SOURCE_KEY` - the private key of the `KARMA_SOURCE`.
- `SHARED_OWNER_REDDIT` - the account representing Reddit's shared owner (receives 20% of tokens when starting a new round).
- `SHARED_OWNER_RESERVE` - the account representing a reserve (receives 20% of tokens when starting a new round).
- `SHARED_OWNER_MODERATORS` - the account representing moderators (receives 10% of tokens when starting a new round).
- `SUBREDDIT` - the name of the subreddit served by these contracts. `TestSubreddit` by default.
- `NAME` - the name of the subreddit points token. `TESTMOON` by default.
- `SYMBOL` - the symbol of the subreddit points token. `TMOON` by default.
- `POINTS_CONTRACT` - the address of `SubredditPoints` proxy contract. Should be left empty as it will be filled (rewritten) automatically by deployment script.
- `DISTRIBUTIONS_CONTRACT` - the address of `Distributions` proxy contract. Should be left empty as it will be filled (rewritten) automatically by deployment script.
- `SUBSCRIPTIONS_CONTRACT` - the address of `Subscriptions` proxy contract. Should be left empty as it will be filled (rewritten) automatically by deployment script.

## Step 2. Generating user addresses

Run the following command:

```bash
$ npm run generate-users
```

It will create `users.csv` file in the root of the repo with `100,000` rows and the following columns (separated by a comma):

```
account,privateKey,karma,signature
```

Karma of each user is generated randomly in the range from 150 to 400. The `signature` column contains a signature created by the `KARMA_SOURCE` address. These fields will be needed for calling the [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) function on the `Step 6`.

This step can take a lot of time since it checks a `nonce` for each generated address (and sends the corresponding `eth_getTransactionCount` JSON RPC). If the script is interrupted (intentionally or due to a disconnection), it can be restarted and the generating process will continue from the previous known point.

## Step 3. Smart contracts deploying and initialization

Run the following command:

```bash
$ npm run deploy
```

It will deploy and initialize the contracts and write their proxy addresses to `.env` file (into its `POINTS_CONTRACT`, `DISTRIBUTIONS_CONTRACT`, `SUBSCRIPTIONS_CONTRACT` variables). During the contracts initialization, this script will read the `karma` column of the `users.csv` to get total karma and pass it to [`Distributions.initialize`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1887) function.

Note, that the SubredditPoints contract has [`decimals()`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1762-L1764) public getter returning 18 which means that the test points (tokens) has 18 decimals like Ethereum.

## Step 4. Enable zero gas price on xDai chain

The scripts of this repo can be used on another xDai-like chain which has zero gas price transactions enabled by default (for example, the test `qDai` chain). For such a chain, this step should be skipped.

To allow zero gas price transactions to the listed functions of the Reddit smart contracts on the xDai chain, we need to modify corresponding rules in the [`TxPermission`](https://github.com/poanetwork/posdao-contracts/blob/master/contracts/TxPermission.sol) contract (and then switch [TxPermission proxy](https://github.com/poanetwork/poa-chain-spec/blob/55d94e928ab942bcdc77cdf3936245492272c10a/spec.json#L57) to it's modified implementation by POSDAO owner address). Example of the corresponding `TxPermission` implementation modifying: https://github.com/poanetwork/posdao-contracts/commit/f47ab5b6cf1103e3c47d1c98adb056361dcc0e7a

## Step 5. Generating load transactions

Run the following command:

```bash
$ npm run generate-txs
```

The generator script will append the `users.csv` file by the following columns (separated by a comma):

```
...,claimTx,subscribeTx,burnTx,transferTx
```

So, after this command is performed, the `users.csv` file will have the following columns (and `100,000` rows):

```
account,privateKey,karma,signature,claimTx,subscribeTx,burnTx,transferTx
```

- `claimTx` represents a call to [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) function. The `round` parameter of the call is set to `0` assuming we're on the very first round.
- `subscribeTx` represents a call to [`Subscriptions.subscribe`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1867) function (with `renewable` argument set to `true`).
- `burnTx` represents a call to [`SubredditPoints.burn`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1640) function (with `amount` argument set to 10 tokens (10 * 10^18 wei)).
- `transferTx` represents a call to [`SubredditPoints.transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L397) function. The `recipient` argument is set so that the first 50000 users send 1 token (1 * 10^18 wei) to the remaining 50000 users, and vice versa.

Each transaction is signed by the `privateKey` of the corresponding user (taken from the same row). The `nonce` of each transaction is set statically assuming that it starts from `0` for each address.

After this step, the `users.csv` file will have a size of about 170 Mb.

## Step 6. Performing the load

To launch a script for sending the generated transactions, there is `npm run load` command which accepts CLI options:

```
Usage: npm run load -- <options>

Options:
  -t, --type <type>        transaction type. Possible values: claim, subscribe, burn, transfer
  -p, --passes [number]    how many passes to perform. 0 for unlimited (default: 1)
  -l, --tx-limit [number]  how many transactions per one pass (default: 1)
  -h, --help               display help for command
```

The load script can perform each of four types of transactions written to `users.csv`. When running the script, it only performs transactions of a certain `--type` per the run.

To limit the load by a specified number of transactions, there are two options: `--passes` and `--tx-limit`.

For example, we want to perform 1000 `claim` transactions splitting them by 10 passes 100 txs each (this will help keeping transaction queue on the chain clear):

```bash
$ npm run load -- --type=claim --passes=10 --tx-limit=100
```

The script will not send transactions from the next pass until all transactions from the current pass are handled by the chain (i.e. their receipts are received by the script). So, we can regulate the load relaunching the script with different `--tx-limit` parameter.

After each pass, transaction results are written to `users.csv` into a separate column and the current performance information is displayed in the console. For example:

```
2020-07-06 07:50:37 UTC Reading CSV...

2020-07-06 07:50:38 UTC Sending 50 'subscribe' transactions...
2020-07-06 07:50:38 UTC Waiting for mining...
2020-07-06 07:50:42 UTC Processed (50 succeeded, 0 reverted, 0 failed)
2020-07-06 07:50:42 UTC Blocks range: 10812249 - 10812249
2020-07-06 07:50:42 UTC TXs mined since start: 50
2020-07-06 07:50:42 UTC Cumulative performance: 12.84 txs/sec

2020-07-06 07:50:42 UTC Sending 50 'subscribe' transactions...
2020-07-06 07:50:42 UTC Waiting for mining...
2020-07-06 07:50:46 UTC Processed (50 succeeded, 0 reverted, 0 failed)
2020-07-06 07:50:46 UTC Blocks range: 10812250 - 10812250
2020-07-06 07:50:46 UTC TXs mined since start: 100
2020-07-06 07:50:46 UTC Cumulative performance: 11.61 txs/sec

2020-07-06 07:50:47 UTC Finished
```

There are four columns appended to the CSV by the load script, one column for each transaction type:

```
claimed,subscribed,burned,transferred
```

Each column can have an empty value or the boolean value of `Y` or `N`. For example, `Y` in the `claimed` column means that the corresponding [`claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) transaction was successful, and `N` means that the transaction reverted. An empty value means that the corresponding transaction hasn't been sent yet (hasn't been handled by the load script).

For the specified `--type` the load script ignores the rows in `users.csv` which has already been set to `Y` or `N` for the corresponding column, and continues to send transactions for the rows that have an empty value for the corresponding column. That way, the load script can be launched several times (until it fills the corresponding column for all the rows).

The load script can be stopped by `CTRL+C` or through `SIGTERM` signal with `kill -15 <pid>` command if needed: in this case, it completes the latest batch of transactions, saves the latest results to `users.csv`, and then terminates.

Load transactions should be performed in the following order (because the prepared transactions in `users.csv` are signed with an explicit `nonce` which is defined based on the order):
- claim
- subscribe
- burn
- transfer

So, during the demo, first, the users claim tokens, then part of them subscribe to subreddit membership, then part of them burn their tokens, and then the users transfer tokens to each other.

## Emitted events

Each transaction emits the corresponding event:
- [`Distributions.claim`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1931) emits [`ClaimPoints`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Distributions_v0.sol#L1951) event.
- [`Subscriptions.subscribe`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1867) emits [`Subscribed`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/Subscriptions_v0.sol#L1885) event.
- [`SubredditPoints.burn`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1640) emits [`Burned`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L1747) and [`Transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L531) events. For `Transfer` event, the `to` argument is set to `address(0)`.
- [`SubredditPoints.transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L397) emits [`Transfer`](https://github.com/xdaichain/reddit-scaling-demo/blob/996b164db971463447f761c77012eef2152af4dd/contracts/SubredditPoints_v0.sol#L495) event with `to` set to non-zero address.

All transactions and events can be seen with our [Blockscout](http://blockscout.com/) explorer.
