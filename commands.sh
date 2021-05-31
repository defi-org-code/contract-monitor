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

# open ports gcloud
gcloud compute firewall-rules create port81 --allow tcp:81 --source-tags=graphite-1 --source-ranges=0.0.0.0/0 --description="open port81 for django"
gcloud compute firewall-rules create port2003 --allow tcp:2003 --source-tags=graphite-1 --source-ranges=0.0.0.0/0 --description="open port2003 graphite client"

# retention

docker stop ID
docker inspect ID

#/var/lib/docker/volumes/50fefcc1eaf881e464f87b466e72629fcbe3ad47aebf7630a63d7ed087edc9c3/_data
# edit storage-schemas.conf
