# Dockerized scripts for Reddit scaling demo

This repo contains a docker-compose file and instructions on running https://github.com/xdaichain/reddit-scaling-demo commands with Docker Compose.

It expects the same `.env` file and `data` directory mentioned in https://github.com/xdaichain/reddit-scaling-demo. If you are unfamiliar with the configs and commands, please, read https://github.com/xdaichain/reddit-scaling-demo#readme.

### generate-users

To run the command:

```bash
$ docker-compose run --rm demo generate-users
```

### deploy

```bash
$ docker-compose run --rm demo deploy
```

### generate-txs

```bash
$ docker-compose run --rm demo generate-txs
```

### load

To see help, run

```bash
$ docker-compose run --rm demo load -- --help
```

To run the load, use

```bash
$ docker-compose rm -f demo
$ docker-compose run -d demo load -- -t <tx_type> -p <passes> -l <txs_per_pass> -i <interval> -q <queue_limit>
```

To see the current logs of the load:

```bash
$ tail -f -n 50 data/load.log
```

To send `SIGINT` signal to the load script:

```bash
$ kill -2 $(cat data/tmp.pid)
```

To send `SIGTERM` signal to the load script:

```bash
$ kill -15 $(cat data/tmp.pid)
```

To see statistics from the CSV file:

```bash
$ docker-compose run --rm demo load -- -s
```

### recheck

There is a `recheck` command which can be used if the load script is interrupted for some reason and you are not sure about the results saved to `users.csv`.

When the load script is unexpectedly or intentionally interrupted, not all results can we written to `users.csv` file. In this case, the lines in the CSV can be rechecked by contract getters (or `nonce` value for the corresponding address from the first column). The rechecking script will read all the rows in the specified range and check/fix a value of a specified column. Then, it will rewrite the fixed `users.csv`.

To see help, run

```bash
$ docker-compose run --rm demo recheck -- --help
```

The example of usage:

```bash
$ docker-compose run --rm demo recheck -- -t claim -s 12300 -f 12400
```

This will recheck and fix the rows in the range `12300-12400` for the `claim` results (the corresponding `claimed` column).

Note that the `recheck` command will send JSON RPC calls for each row in the specified range, so if your server is geographically far from the RPC server, rechecking can take a long time for a large range.
