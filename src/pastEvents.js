
const BLOCKS_PER_MINUTE = 4;
const BLOCKS_PER_HOUR = BLOCKS_PER_MINUTE * 60;
const BLOCKS_PER_DAY = BLOCKS_PER_HOUR * 24;

async function getEventsPara(contract, eventName, fromBlock, latestBlock, returnOnFirst){
  console.log(`${contract.options.address}:${eventName} getEventsPara total ${fromBlock}-${latestBlock}`)
  events = [];
  
  let start = fromBlock;
  const batchSize = 16;
  let batches = [];
  let batch;
  const steps = parseInt(BLOCKS_PER_DAY/16);
  let count = 0;
  let batchStart;
  let end ;
  while (start < latestBlock){    
    batchStart = start;
    for (let i=0; i < batchSize && start < latestBlock; ++i){
      end = Math.min(start + steps, latestBlock);
      //console.log(`getEventsPara ${start}-${end}`)
      batches.push(contract.getPastEvents(eventName,{                               
        fromBlock: start,     
        toBlock: end // You can also specify 'latest'          
      }));
      start = end;// probably not useful+1;
    }
    let res = await Promise.all(batches).catch((e)=>{
      console.error("getEventsPara Promise.all",e);
      return events;
    });
    // CLEAR!
    batches = [];
    //console.log(`getEventsPara aprox day batchDone ${batchStart}-${end}`);
    if (res !== null){
      for(let arr of res)
        if(arr.length){
          events = events.concat(arr);
          if(returnOnFirst)
            return events;
        }
    }    
  } 
  return events;  
}

async function test(){
  // test overlapping
  const ctrct = new web3.eth.Contract(abi, univ2); 
  let latest = latestBlock? latestBlock : await web3.eth.getBlockNumber().on("error", (error)=>{
    console.error("getBlockNumber")
  });    
  if( latest <= fromBlock ){
    return; //resolve(nil);
  }
  let evs = await getEventsPara(ctrct, ExecuteTransaction, latest-twoWeeks, latest);
  console.timeEnd("test");  
  var blocks = {}
  evs.forEach( (e)=>{
     console.log(`${e.blockNumber}\t${e.logIndex}\t${e.transactionIndex}`)
  });

  console.log("DONE");
}

// test
if (require.main === module) {
  test();
}

module.exports.getEventsPara = getEventsPara;
