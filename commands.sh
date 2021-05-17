# ssh -i "aviguy.pem" ubuntu@18.189.17.142
#chmod +x setup.sh
#pm2 start contract-monitor.sh --log-date-format 'DD-MM HH:mm:ss'
#pm2 save


# grafana is running on aviguy port 3000
# graphite is running on docker
# https://github.com/graphite-project/docker-graphite-statsd

docker run -d --name graphite --restart=always -p 80:80 -p 2003-2004:2003-2004 -p 2023-2024:2023-2024 -p 8125:8125/udp -p 8126:8126  -v /opt/graphite/:/opt/graphite/  graphiteapp/graphite-statsd 


docker run -d \
--name graphite \
--restart=always \
-p 80:80 \
-p 2003-2004:2003-2004 \
-p 2023-2024:2023-2024 \
-p 8125:8125/udp \
-p 8126:8126 \
-v /opt/graphite:/opt/graphite \
-v /etc/graphite-statsd:/etc/graphite-statsd \
graphiteapp/graphite-statsd

  # mount vol never worked properly 

#--name graphite
# -v "/opt/graphite":"/opt/graphite" -v "/etc/graphite-statsd":"/etc/graphite-statsd"
docker run -d --restart=always -p 80:80 -p 2003-2004:2003-2004 -p 2023-2024:2023-2024 -p 8125:8125/udp -p 8126:8126 graphiteapp/graphite-statsd