docker-compose run --rm demo recheck -- -t claim -s 12200 -f 12300

docker-compose rm -f demo
docker-compose run -d --no-deps demo load -- -t claim -p 30 -l 1
tail -f -n 50 reddit-data/load.log
kill -2 $(cat reddit-data/tmp.pid)
