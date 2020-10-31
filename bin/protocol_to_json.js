if (process.argv.length !== 3) {
  console.log('Usage : node protocol_to_json.js <protocol.json>')
  process.exit(1)
}
const protocolFilePath = process.argv[2]

const writeProtocol = require('../lib/protocol_extractor').writeProtocol

writeProtocol(protocolFilePath, function (err) {
  if (err) {
    console.log(err.stack)
    return
  }
  console.log('Protocol extracted !')
})
