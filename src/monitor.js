var Web3 = require('web3');
var pastEvents = require('./pastEvents');
const config = require('./monitor-config');
const channel = require('./channel');
var fs = require('fs');
var path = require('path');


////////////////////////////////////////////////////////
class Watch{
  constructor(configFile, abiFile, network, chan) {
    this.loaded = false;
    let config = null;
    try {
      let config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      chan.sendMsg('Load Watch config', config);
      this.abi = JSON.parse(fs.readFileSync(abiFile, 'utf8'));      
      this.name = config.name;
      this.network = config.network;
      this.web3 = network[config.network];
      this.address = config.address;      
      this.chan = chan;
      this.contract = new this.web3.eth.Contract(this.abi, this.address);
      this.eventName = config.eventName;      
      this.whiteList = config.whiteList;
      // no exception - keep last
      this.loaded = true;

    }catch(e){
      console.error('Watch::ctor', e);
      return;
    }        
  }
  ////////////////////////////////////////////////////////////////
  shouldAlert(event){
    const matched = event.returnValues.signature.match(/.+?(?=\()/i);
    // alert if not matched with [name(] patter or if matched, but not in whitelist
    return !matched || this.whiteList.indexOf(matched[0]) == -1;  
  }
  ////////////////////////////////////////////////////////////////
  get isLoaded(){
    return this.loaded;
  }
  ////////////////////////////////////////////////////////
  async check(track) {      
    // DEBUG - ETH network
    // track.from = 12358706 -1;
    // track.to= track.from +2;

    const events = await pastEvents.getEventsPara(this.contract, this.eventName, track.from, track.to);
    for(let e of events){
      if (this.shouldAlert(e)){      
        console.log(e.event, e.blockNumber,  e.id, e.returnValues.signature);
        if(this.chan){
          const msg = this.chan.formatMsg(this.name, this.address, this.eventName, e);
          await this.chan.send(msg);
        }
      }
    }    
  }
}
////////////////////////////////////////////////////////
class Monitor{
  ////////////////////////////////////////////////////////
  constructor(VERSION) {
    this.VERSION = VERSION;
    this.network = {};    
    try{
      this.track = JSON.parse(fs.readFileSync('blockTrack.json', 'utf8'));;
    }catch(e){
      this.track = {}
      console.error(e);
    }
  }
  ////////////////////////////////////////////////////////
  loadWatchers(chan){    
    // Loop through all the files in the temp directory
    const basePath = "./watch";
    const baseAbi = "./watch-abi";
    var network = this.network;
    var watchers = [];
    let files;
    try {
      files = fs.readdirSync(basePath);
    }catch(e){
      console.error(e);
      return null;
    }
    files.forEach(function (file, index) {
      console.log("LOAD WATCH", file);
      // Make one pass and make the file complete
      var configFile = path.join(basePath, file);
      let stat = fs.statSync(configFile);      
      if (stat.isFile()){
        var abiFile = path.join(baseAbi, file);
        let w = new Watch(configFile, abiFile, network, chan);
        if(w.isLoaded)
          watchers.push(w);
      }     
    });
    return watchers;
  }  
  ////////////////////////////////////////////////////////
  async check(watchers) {
    // object to track current block per network
    let curBlock = {};

    for(let w of watchers){
      //update current block per network
      if(!curBlock[w.network]){        
        curBlock[w.network] = await w.web3.eth.getBlockNumber().catch(e => console.error(e));
      }
      // update track
      if(!this.track[w.name]){
        this.track[w.name] = {from:curBlock[w.network],to:curBlock[w.network] };
        // first time no need to continue
        return;
      }else{
        // advance track
        this.track[w.name].from = this.track[w.name].to
        this.track[w.name].to = curBlock[w.network];
      }

      if (this.track[w.name].to > this.track[w.name].from)
        await w.check(this.track[w.name]);
    }
  }
  ////////////////////////////////////////////////////////
  initNetwork(){
    console.log("Init web3 network");
    for( let name in config.network){
      this.network[name] = new Web3(config.network[name]);      
      console.log(`${name}\t ${config.network[name]}`)
    }
  }
  
  ////////////////////////////////////////////////////////
  async start() {
    const isProduction = process.env.PRODUCTION==1;
    let chan = new channel.Channel(isProduction? config.channelApi: config.channelDBG, config.minHeartbeat);
   
    await chan.sendMsg(`-------------------- CONTRACT MONITOR ${this.VERSION} start --------------------`, config);

    this.initNetwork();
    const watchers = this.loadWatchers(chan);

    console.log("=============================================")
    console.log(`== ORBS CONTRACT MONITOR V${this.VERSION}`);
    console.log(`== PRODUCTION = ${isProduction? 'true':'false'}`);
    console.log(JSON.stringify(config, null,2));
    console.log("============================================="); 

    setInterval(async ()=>{
      try{      
        // check blockchain
        await this.check(watchers);
        // save tracl per each watcher      
        const jsn = JSON.stringify(this.track);
        fs.writeFileSync('./blockTrack.json', jsn);        
        // channel
        await chan.heartbeat();
      }catch(e){
        console.error("monitor error", e);
        // send exception to discord        
        await chan.sendMsg("monitor error: "+e);
      }
    }, config.secInterval * 1000);
  }
}
////////////////////////////////////////////////////////
module.exports = {
  Monitor: Monitor
}
////////////////////////////////////////////////////////
async function testBunny(){                         
  const web3 = new Web3('wss://misty-white-haze.bsc.quiknode.pro/18a20ffabf304a0b476b92ba91ea9aadaf6a3516/');  
  // sanity
  const curBlock = await web3.eth.getBlockNumber().catch(e => console.error(e));
  const network = {
    "BSC" : web3
  };
  let w = new Watch("./watch/timelock-bunny.json", "./watch-abi/timelock-bunny.json", network, null);
  w.check({from:7282279,to:7282280});
}
///////////////////////////////////////////////////////////
// test
if (require.main === module) {  
  testBunny();

}