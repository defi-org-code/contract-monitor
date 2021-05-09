let monitor = require('./monitor');
var pastEvents = require('./pastEvents');

///////////////////////////////////
const VERSION = "1.4"

///////////////////////////////////
if (require.main === module) {
  try{
    let mon = new monitor.Monitor(VERSION);     
    mon.start();      
  }catch(e){
    console.error("main error", e);
    // send exception to discord
    let str = tmplt_exception;
    let estr = ""+e;
    str = str.replace(/ERROR/g, estr);
    sendAlert(str);
  }
}