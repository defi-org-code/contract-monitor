let monitor = require('./monitor');

///////////////////////////////////
const VERSION = "1.6"

///////////////////////////////////
if (require.main === module) {
  let mon = new monitor.Monitor(VERSION);     
  mon.start();  
}