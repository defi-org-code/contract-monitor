#!/bin/bash
export VERSION=1.2
export INTERVAL=300000; # 5 min
export alchemy="wss://eth-mainnet.ws.alchemyapi.io/v2/bJ2UJBAltFD_dh9J9Zv6gadbiaX5tOJf"
export contractAlerts="https://discord.com/api/webhooks/836247466096459830/OUh8wM7HzEsu86IpPIJ78H_luZ6diZUpFxHSZUDv6oosJa9SyiYI1KRQO11pcz3jLiwj"
node src/main.js

#chmod +x setup.sh