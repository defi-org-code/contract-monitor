const axios = require('axios');

const tmplt_heartbeat = `{
  "username": "contract-bot",
  "avatar_url": "https://www.orbs.com/wp-content/uploads/2018/07/Orbs.png",
  "content": "*Heartbeat* sent every {MIN} minutes"
}`

// const tmplt_exception = `{
//   "username": "contract-bot",
//   "avatar_url": "https://www.orbs.com/wp-content/uploads/2018/07/Orbs.png",
//   "content": "**EXCEPTION** exception thrown on main(): ",
// }`;

const tmplt_msg = `{
  "username": "contract-bot",
  "avatar_url": "https://www.orbs.com/wp-content/uploads/2018/07/Orbs.png",
  "content": "{TITLE}",
  "embeds": []
}`;

const tmplt_alert = `{
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

///////////////////////////////////////////////////////
class Channel{
  constructor(api, minHeartbeat) {        
    this.api = api;
    this.minHeartbeat = minHeartbeat;
    this.lastHeartbeat = Date.now();
    this.production = (process.env.PRODUCTION == 1);
  }
  ////////////////////////////////////////////////////////////////
  formatMsg(contractName, contractId, eventName, event){
    var str = tmplt_alert;
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
  // Heartbeat
  async heartbeat(){
    var diff = Date.now() - this.lastHeartbeat;
    var minDiff = Math.floor(diff/1000/60);
    if (minDiff >= this.minHeartbeat){
      // reset
      this.lastHeartbeat = Date.now();
      // format message
      var str = tmplt_heartbeat;
      str = str.replace('{MIN}',''+this.minHeartbeat );      
      console.log('-------------------- heartbeat --------------------');
      await this.send(JSON.parse(str));
    }
  }
  //////////////////////////////////////////////////////////////// 
  formatEmbed(input, color){
    var res = {                        
      "color": color,
      "fields": []      
    };
    for (let f in input){
      res.fields.push({
        name:f,
        value: typeof input[f] === 'object' ? JSON.stringify(input[f]): input[f]
      });
    }
    return res;
  }
  //////////////////////////////////////////////////////////////// 
  async sendMsg(title, embedObj, color){
    let jsn = tmplt_msg.replace('{TITLE}', title);
    let obj = JSON.parse(jsn);
    if(embedObj){
      if(!color)
        color = 15258703;
      obj.embeds.push(this.formatEmbed(embedObj, color))
    }
    await this.send(obj);
  }
  //////////////////////////////////////////////////////////////// 
  async send(obj){       
    await axios.post(this.api, obj).catch(error => console.error(error));
  }
}

////////////////////////////////////////////////////////
module.exports = {
  Channel: Channel
}