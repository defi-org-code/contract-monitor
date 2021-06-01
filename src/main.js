let monitor = require('./monitor');

///////////////////////////////////
const VERSION = "1_9"

///////////////////////////////////
if (require.main === module) {
  let mon = new monitor.Monitor(VERSION);     
  mon.start();  
}