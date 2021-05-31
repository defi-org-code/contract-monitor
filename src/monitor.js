var Web3 = require('web3');
const graphite = require('graphite');

var pastEvents = require('./pastEvents');
const config = require('./monitor-config');
const channel = require('./channel');
var fs = require('fs');
var path = require('path');


////////////////////////////////////////////////////////
class Task{
  ////////////////////////////////////////////////////////
  constructor(configFile, abiFile, network, chan) {
    this.lastTime = null;
    this.loaded = false;    
    try {
      let config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      // check inactive
      this.active = config.hasOwnProperty('active')? config.active : true;
      if(!this.active)
        return;

      chan.sendMsg('Load Task config', config);
      this.abi = JSON.parse(fs.readFileSync(abiFile, 'utf8'));      
      this.name = config.name;
      this.network = config.network;
      this.web3 = network[config.network];
      this.minInterval = config.minInterval;
      // create all contracts instances
      this.contracts = []
      for (let addr of config.addresses)
        this.contracts.push( new this.web3.eth.Contract(this.abi, addr) );
      
      this.read = config.read;
      
      // no exception - keep last
      this.loaded = true;

    }catch(e){
      console.error('Watch::ctor', e);
      return;
    }        
  }
  ////////////////////////////////////////////////////////
  get isLoaded(){
    return this.loaded;
  }
  ////////////////////////////////////////////////////////
  due(now){
    if(!this.lastTime)
      return true;

    var diff = now - this.lastTime;
    var minDiff = Math.floor(diff/1000/60);
    return (minDiff >= this.minInterval);

  }
  ////////////////////////////////////////////////////////
  async exec(counter){
    // update exec time
    this.lastTime = Date.now();

    //iterate all contract instances 
    for (let c of this.contracts){
      // call all read functions within
      for( let r of this.read){
        let res = await c.methods[r.func]().call().catch(e => console.error(e));        
        if(res){
          // monitor return values
          if(r.metrics){
            // return value with fields
            for (let m of r.metrics ){            
              const path = `task.${this.name}-${c._address.substring(0,6)}.${r.func}.${m}`
              console.log(`${path}:\t ${res[m]}`);
              const val = parseFloat(res[m]);
              counter.set(path, val);
            }
          } // simple numeric return value
          else{
            const path = `task.${this.name}-${c._address.substring(0,6)}.${r.func}.val`
            console.log(`${path}:\t ${res}`);
            const val = parseFloat(res);
            counter.set(path, val);            
          }
        }        
      }
    }
  }
}

////////////////////////////////////////////////////////
class Watch{
  ////////////////////////////////////////////////////////
  constructor(configFile, abiFile, network, chan) {
    this.loaded = false;    
    try {
      let config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      // check inactive
      this.active = config.hasOwnProperty('active')? config.active : true;
      if(!this.active)
        return;

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
  enumFolderFiles(basePath, baseAbi, cb){    
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
        cb(configFile, abiFile);     
      }     
    });    
  }
  ////////////////////////////////////////////////////////
  loadWatchers(chan){    
    let watchers = [];
    const network = this.network;
    this.enumFolderFiles("./watch", "./watch-abi", (configFile, abiFile)=>{
      let w = new Watch(configFile, abiFile, network, chan);
      if(w.isLoaded)
        watchers.push(w);
    });
    return watchers;
  }
  
  ////////////////////////////////////////////////////////
  loadTasks(chan){    
    let tasks = [];
    const network = this.network;
    this.enumFolderFiles("./task", "./watch-abi", (configFile, abiFile)=>{
      let t = new Task(configFile, abiFile, network, chan);
      if(t.isLoaded && t.active)
        tasks.push(t);
    });
    return tasks;
    
  }  
  ////////////////////////////////////////////////////////
  async check(watchers, tasks, chan) {
    // object to track current block per network
    let curBlock = {};
  
    // execute watchers
    for(let w of watchers){
      //update current block per network
      if(!curBlock[w.network]){
        curBlock[w.network] = await w.web3.eth.getBlockNumber();         
        if(!curBlock[w.network])
          return;
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
        await w.check(this.track[w.name], this.counter);
    }
    // execute tasks
    const now = Date.now();
    for(let t of tasks){
      if(t.due(now)){
        await t.exec(this.counter);
      }
    }
  }
  ////////////////////////////////////////////////////////
  initNetwork(){
    console.log("Init web3 network");
    // Add reconnect option
    const options = {
      reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false
      }
    }
  
    for( let name in config.network){
      this.network[name] = new Web3(config.network[name],options);      
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
    const tasks = this.loadTasks(chan);

    console.log("=============================================")
    console.log(`== ORBS CONTRACT MONITOR V${this.VERSION}`);
    console.log(`== PRODUCTION = ${isProduction? 'true':'false'}`);
    console.log(JSON.stringify(config, null, 2));
    console.log("============================================="); 

    // debug overridr
    if(!isProduction){
      //config.graphiteUrl = "http://18.189.17.142:2003";
      config.secInterval = 10;
    }

    const COUNTER_PREFIX = `contractMonitor.${this.VERSION}.${isProduction? 'production':'debug'}`
    const grphClient = graphite.createClient(config.graphiteUrl);
    this.counter = require("./counter")(grphClient, COUNTER_PREFIX);

    setInterval(async ()=>{
      try{      
        // check blockchain
        await this.check(watchers, tasks, chan);
        // save tracl per each watcher      
        const jsn = JSON.stringify(this.track);
        fs.writeFileSync('./blockTrack.json', jsn);        
        // channel
        await chan.heartbeat();
        
        // send process ALIVE
        this.counter.addStat("interval", 1);
        this.counter.sendMetrics();
      }catch(e){
        console.error("monitor error", e);
        // send exception to discord        
        await chan.sendMsg("monitor error - check err logs");
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
  const web3 = new Web3('https://misty-white-haze.bsc.quiknode.pro/18a20ffabf304a0b476b92ba91ea9aadaf6a3516/');  
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