FROM node:14
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production

ENV VERSION=1.1
ENV INTERVAL=60000
COPY . .
CMD [ "node", "src/main.js" ]

# docker build -t contract-bot .
# docker run -it contract-bot
# docker tag contract-bot uvorbs/contract-bot:1.1
# docker push uvorbs/contract-bot:1.1

# export
# docker save uvorbs/contract-bot:1.1 | gzip > contract-bot.tar.gz
