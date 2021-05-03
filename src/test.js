var Web3 = require('web3');
var abi = require('./timelock-sushi-abi.js');
const alchemy ='wss://eth-mainnet.ws.alchemyapi.io/v2/bJ2UJBAltFD_dh9J9Zv6gadbiaX5tOJf';
var contractAddress = '0x9a8541Ddf3a932a9A922B607e9CF7301f1d47bD1'; //Timelock-Sushi-Masterchef
let web3 = new Web3(alchemy || "ws://localhost:8545");
///////////////////////////////////////////////
async function test1() {
  var contract = new web3.eth.Contract(abi, contractAddress);
  const eventName = 'QueueTransaction';
  const events = await contract.getPastEvents(eventName,{                               
    fromBlock: 12358700,
    toBlock: 12358800
  })
  for(let e of events){
    console.log(e);
  }
}
///////////////////////////////////////////////
if (require.main === module) {
  test1();
}