if(process.argv.length !=3) {
  console.log("Usage : node protocol_to_json.js <protocol.json>");
  process.exit(1);
}
var protocolFilePath=process.argv[2];

var writeProtocol=require("./").writeProtocol;

writeProtocol(protocolFilePath);