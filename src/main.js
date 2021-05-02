var Web3 = require('web3');
var pastEvents = require('./pastEvents');
const configFile = "config.json";
const fs = require('fs');
const VERSION = process.env.VERSION || 'SET VERSION IN ENVIRONMENT'
const INTERVAL = parseInt(process.env.INTERVAL);
const alchemy =  process.env.ALCHEMY || 'wss://eth-mainnet.ws.alchemyapi.io/v2/bJ2UJBAltFD_dh9J9Zv6gadbiaX5tOJf';
const contractAlerts = process.env.CONTRACT_ALERTS || 'https://discord.com/api/webhooks/836247466096459830/OUh8wM7HzEsu86IpPIJ78H_luZ6diZUpFxHSZUDv6oosJa9SyiYI1KRQO11pcz3jLiwj';
const axios = require('axios');
//let web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");
let web3 = new Web3(alchemy || "ws://localhost:8545");
var abi = require('./timelock-sushi-abi.js');
var contractAddress = '0x9a8541Ddf3a932a9A922B607e9CF7301f1d47bD1'; //Timelock-Sushi-Masterchef

const tmplt_exception = `{
  "username": "contract-bot",
  "avatar_url": "https://www.orbs.com/wp-content/uploads/2018/07/Orbs.png",
  "content": "**EXCEPTION** exception thrown on main(): ",
}`;

const tmplt = `{
  "username": "contract-bot",
  "avatar_url": "https://www.orbs.com/wp-content/uploads/2018/07/Orbs.png",
  "content": "**EVENT_NAME** on contract CONTRACT_NAME CONTRACT_ID",
  "embeds": [
      {                        
          "color": 15258703,
          "fields": [
              {
                  "name": "Block Number:",
                  "value": "BLOCK_NUMBER"                    
              },
              {
                  "name": "ID:",
                  "value": "LOG_ID"
              },
              {
                  "name": "Signature:",
                  "value": "SIGNATURE"
              }
          ]
      }
  ]
}`;
////////////////////////////////////////////////////////////////
function shouldAlert(event){
  return true;
}
////////////////////////////////////////////////////////////////
function formatMsg(contractName, contractId, eventName, event){
  var str = tmplt;
  //console.log(e.event, e.blockNumber,  e.id, e.returnValues.signature);
  var mapObj = {
    CONTRACT_NAME: contractName,
    EVENT_NAME: eventName,
    CONTRACT_ID: contractId,
    BLOCK_NUMBER: event.blockNumber,
    LOG_ID: event.id,
    SIGNATURE: event.returnValues.signature
  };
  str = str.replace(/EVENT_NAME|CONTRACT_NAME|CONTRACT_ID|BLOCK_NUMBER|LOG_ID|SIGNATURE/g, function(matched){
    return mapObj[matched];
  });
  return JSON.parse(str);
}
////////////////////////////////////////////////////////////////
function sendAlert(msg){    
  axios.post(contractAlerts, msg)
    .then(res => {
      console.log(`statusCode: ${res.statusCode}`)
      console.log(res)
    })
    .catch(error => {
      console.error(error)
    });

}
////////////////////////////////////////////////////////////////
async function check(from, to) {  
  console.log(`check block ${from} ${to}`);
  var contract = new web3.eth.Contract(abi, contractAddress);
  const eventName = 'ExecuteTransaction';
  const events = await pastEvents.getEventsPara(contract, eventName, from, to);
  for(let e of events){
    if (shouldAlert(e)){      
      console.log(e.event, e.blockNumber,  e.id, e.returnValues.signature);      
      sendAlert(formatMsg("timelock-sushi-masterchef", contractAddress, eventName, e));
    }
  }
  return true;
}
////////////////////////////////////////////////////////////////
function load(curBlock){
  const dayBlocks = 21600;
  try{
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  }catch(e){        
    return {      
      to: curBlock - dayBlocks
    }
  }
}
////////////////////////////////////////////////////////////////
function save(config){
  let data = JSON.stringify(config);
  fs.writeFileSync(configFile, data); 
}
////////////////////////////////////////////////////////////////
async function main(){  
  console.log("=============================================")
  console.log(`== ORBS CONTRACT MONITOR V${VERSION}`)
  let curBlock = await web3.eth.getBlockNumber().catch(e => console.error(e));
  console.log(`== CURRENT_BLOCK ${curBlock}`)
  console.log(`VERSION: ${VERSION}`);
  console.log(`INTERVAL: ${INTERVAL}`);
  console.log(`WEB3: ${alchemy}`);
  console.log(`CONTRACT_ALERTS_API: ${contractAlerts}`);  
  console.log("=============================================")  
  let config = load(curBlock);

  setInterval(async ()=>{
    config.from = config.to;
    curBlock = await web3.eth.getBlockNumber().catch(e => console.error(e));
    
    if(curBlock){
      config.to = curBlock;
      if (config.to > config.from && check(config.from, config.to)){      
        if (curBlock){
          save(config);
        }
      }
    }
  },INTERVAL);
}
////////////////////////////////////////////////////////////////
if (require.main === module) {
  try{
    main();  
  }catch(e){
    console.error("main error", e);
    // send exception to discord
    let str = tmplt_exception;
    let estr = ""+e;
    str = str.replace(/ERROR/g, estr);
    sendAlert(str);
  }
}

