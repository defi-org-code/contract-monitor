let monitor = require('./monitor');

///////////////////////////////////
const VERSION = "1.5"

///////////////////////////////////
if (require.main === module) {
  let mon = new monitor.Monitor(VERSION);     
  mon.start();  
}