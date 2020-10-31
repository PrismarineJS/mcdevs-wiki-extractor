const WikiTextParser = require('parse-wikitext')
const async = require('async')
const R = require('ramda')
const fs = require('fs')
const pandoc = require('pdc')
const path = require('path')

const wikiTextParser = new WikiTextParser('wiki.vg')

const parseWikiTable = require('./common/table_parser').parseWikiTable
const getFirstTable = require('./common/table_parser').getFirstTable
const tableToRows = require('./common/table_parser').tableToRows
const toOldNames = require('./common/toOldNames').transformPacketName

module.exports = {
  tableToRows: tableToRows,
  parseWikiTable: parseWikiTable,
  tableToPacket: tableToPacket,
  writeProtocol: writeProtocol,
  writeComments: writeComments
}

function writeComments (protocolFilePath, cb) {
  async.waterfall([
    getProtocolComments
  ],
  function (err, protocol) {
    if (err) { return cb(err) }
    // console.log(JSON.stringify(protocol,null,2));
    fs.writeFile(protocolFilePath, JSON.stringify(protocol, null, 2), cb)
  }
  )
}

function writeProtocol (protocolFilePath, cb) {
  async.waterfall([
    getProtocol
  ],
  function (err, protocol) {
    if (err) { return cb(err) }
    // console.log(JSON.stringify(protocol,null,2));
    fs.writeFile(protocolFilePath, JSON.stringify(protocol, null, 2), cb)
  }
  )
}

function retrieveProtocol (cb) {
  wikiTextParser.getArticle('Protocol', function (err, data) {
    if (err) {
      cb(err)
      return
    }
    const sectionObject = wikiTextParser.pageToSectionObject(data)
    cb(err, sectionObject)
  })
}

function getProtocol (cb) {
  async.waterfall([
    retrieveProtocol,
    extractProtocol.bind(null, parsePacket),
    transformProtocol.bind(null, initialPacket, appendPacketToProto, transformPacket, toOldNames)
  ], cb)
}

function getProtocolComments (cb) {
  async.waterfall([
    retrieveProtocol,
    extractProtocol.bind(null, commentsForPacket),
    transformProtocol.bind(null, function () { return {} }, function (obj, name, v) { obj[name] = v; return obj }, function (v) { return v }, toOldNames)
  ], cb)
}

function extractProtocol (fnPacket, sectionObject, cb) {
  const notStates = R.omit(['content', 'Definitions', 'Packet format'])

  async.mapValues(notStates(sectionObject), function (state, stateName, cb) {
    async.mapValues(notStates(state), function (direction, directionName, cb) {
      async.mapValues(notStates(direction), function (packet, packetName, cb) {
        fnPacket(packet.content, cb)
      }, cb)
    }, cb)
  }, cb)
}

function commentsForPacket (packetText, cb) {
  let afterFirstTable = false
  let inTable = false
  const table = parseWikiTable(getFirstTable(packetText))
  const id = table.length > 0 && table[0]['Packet ID'] && table[0]['Packet ID'].toLowerCase()
  const packet = packetText.reduce(function (acc, line) {
    if (!afterFirstTable && line === '{| class="wikitable"') { inTable = true } else if (inTable && line === ' |}') {
      inTable = false
      afterFirstTable = true
    } else if (afterFirstTable) { acc.after.push(line) } else if (!inTable) { acc.before.push(line) }
    return acc
  }, { before: [], after: [], id: id })
  pandoc(packet.before.join('\n'), 'mediawiki', 'markdown_github', ['-F', path.join(__dirname, 'relink.js')], function (err, result) {
    if (err) return cb(err)
    packet.before = result.split('\n')
    pandoc(packet.after.join('\n'), 'mediawiki', 'markdown_github', ['-F', path.join(__dirname, 'relink.js')], function (err, result) {
      if (err) return cb(err)
      packet.after = result.split('\n')
      return cb(null, packet)
    })
  })
}

function parsePacket (packetText, cb) {
  cb(null, tableToPacket(parseWikiTable(getFirstTable(packetText))))
}

function tableToPacket (table) {
  const packet = {}
  if (table.length === 0 || table[0]['Packet ID'] === undefined) { return null }
  packet.id = table[0]['Packet ID']
  packet.fields = table
    .filter(function (value) {
      return !value['Field Name'] || value['Field Name'] !== "''no fields''"
    })
    .map(function (value) {
      if (value['Field Name'] === undefined || value['Field Type'] === undefined) {
      // console.log(value);
        return null
      }
      return {
        name: value['Field Name'],
        type: value['Field Type']
      }
    })
  return packet
}

function initialPacket () {
  return {
    types: {
      packet: ['container', [
        {
          name: 'name',
          type: ['mapper', {
            type: 'varint',
            mappings: {}
          }]
        }, {
          name: 'params',
          type: ['switch', {
            compareTo: 'name',
            fields: {}
          }]
        }
      ]]
    }
  }
}

function appendPacketToProto (state, name, packet) {
  state.types['packet_' + name] = ['container', packet.fields]
  state.types.packet[1][0].type[1].mappings[packet.id] = name
  state.types.packet[1][1].type[1].fields[name] = 'packet_' + name
  return state
}

// transforms
function transformProtocol (initialState, addToPacket, transformPacket, transformPacketName, protocol, cb) {
  let transformedProtocol = Object
    .keys(protocol)
    .reduce(function (transformedProtocol, state) {
      const transformedState = transformState(state)
      transformedProtocol[transformedState] = Object
        .keys(protocol[state])
        .reduce(function (stateO, direction) {
          const transformedDirection = transformDirection(direction)
          stateO[transformedDirection] = Object
            .keys(protocol[state][direction])
            .reduce(function (packetsO, packetName) {
              const transformedPacket = transformPacket(protocol[state][direction][packetName], transformedState, transformedDirection)
              const transformedPacketName = transformPacketName(packetName, transformedState, transformedDirection, transformedPacket ? transformedPacket.id : null)
              return addToPacket(packetsO, transformedPacketName, transformedPacket)
            }, initialState())
          return stateO
        }, {})
      return transformedProtocol
    }, {})
  transformedProtocol = reorder(['handshaking', 'status', 'login', 'play'], transformedProtocol)
  cb(null, transformedProtocol)
}

function reorder (order, obj) {
  return order.reduce(function (rslt, prop) {
    rslt[prop] = obj[prop]
    return rslt
  }, {})
}

function transformPacket (packet, state, direction) {
  if (!packet) { return null }
  const transformedId = transformId(packet.id)
  return {
    id: transformedId,
    fields: packet.fields ? packet.fields.map(function (field) { return transformField(field, state, direction, transformedId) }) : null
  }
}

function transformId (id) {
  return id ? id.toLowerCase() : null
}

function transformField (field, state, direction, id) {
  return field
    ? {
        name: transformFieldName(field.name, state, direction, id),
        type: transformFieldType(field.type)
      }
    : null
}

function transformState (state) {
  return state.toLowerCase()
}

function transformDirection (direction) {
  if (direction === 'Serverbound') return 'toServer'
  if (direction === 'Clientbound') return 'toClient'
}

function toCamelCase (name) {
  const words = name.split(' ')
  words[0] = words[0].toLowerCase()
  for (let i = 1; i < words.length; i++) words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase()
  return words.join('')
}

function transformFieldType (fieldType) {
  fieldType = fieldType.toLowerCase().replace('unsigned ', 'u').replace('boolean', 'bool').replace('[[chat]]', 'string')
    .replace('angle', 'byte').replace('uuid', 'UUID')
  if (fieldType.indexOf('varint') !== -1) return 'varint'
  if (fieldType.indexOf('slot') !== -1) return 'slot'
  if (fieldType.indexOf('entity metadata') !== -1) return 'entityMetadata'
  if (fieldType.indexOf('nbt') !== -1) return 'restBuffer'
  if (fieldType.indexOf('ubyte') !== -1) return 'u8'
  if (fieldType.indexOf('byte') !== -1) return 'i8'
  if (fieldType.indexOf('ushort') !== -1) return 'u16'
  if (fieldType.indexOf('short') !== -1) return 'i16'
  if (fieldType.indexOf('uint') !== -1) return 'u32'
  if (fieldType.indexOf('int') !== -1) return 'i32'
  if (fieldType.indexOf('ulong') !== -1) return 'u64'
  if (fieldType.indexOf('long') !== -1) return 'i64'
  return fieldType
}

// specific has priority over general

// specific
const newToOldFieldNamesSpecific = {
  status: {
    toClient: {
      '0x01': {
        payload: 'time'
      }
    },
    toServer: {
      '0x01': {
        payload: 'time'
      }
    }
  },
  login: {
    toServer: {
      '0x00': {
        name: 'username'
      }
    }
  },
  play: {
    toClient: {
      '0x01': {
        gamemode: 'gameMode'
      },
      '0x0e': {
        data: 'objectData'
      },
      '0x21': {
        data: 'chunkData'
      },
      '0x2b': {
        value: 'gameMode'
      },
      '0x2f': {
        slotData: 'item'
      },
      '0x30': {
        slotData: 'items'
      },
      '0x32': {
        actionNumber: 'action'
      },
      '0x3b': {
        mode: 'action',
        objectiveName: 'name'
      },
      '0x3c': {
        scoreName: 'itemName',
        objectiveName: 'scoreName'
      },
      '0x3d': {
        scoreName: 'name'
      }
    },
    toServer: {
      '0x02': {
        type: 'mouse'
      },
      '0x08': {
        face: 'direction',
        cursorPositionX: 'cursorX',
        cursorPositionY: 'cursorY',
        cursorPositionZ: 'cursorZ'
      },
      '0x09': {
        slot: 'slotId'
      },
      '0x0b': {
        payload: 'actionId'
      },
      '0x0c': {
        flags: 'jump'
      },
      '0x0e': {
        actionNumber: 'action'
      },
      '0x0f': {
        actionNumber: 'action'
      },
      '0x16': {
        actionId: 'payload'
      }
    }
  }
}

// should probably be converted entirely in the specific format
// general
const newToOldFieldNamesGeneral = {
  serverAddress: 'serverHost',
  jsonResponse: 'response',
  jsonData: 'message',
  worldAge: 'age',
  timeOfDay: 'time',
  playerUuid: 'playerUUID',
  deltaX: 'dX',
  deltaY: 'dY',
  deltaZ: 'dZ',
  chunkX: 'x',
  chunkZ: 'z',
  'ground-upContinuous': 'groundUp',
  primaryBitMask: 'bitMap',
  size: 'chunkDataLength',
  blockId: 'type',
  blockType: 'blockId',
  recordCount: 'count',
  records: 'affectedBlockOffsets',
  disableRelativeVolume: 'global',
  effectPositionX: 'x',
  effectPositionY: 'y',
  effectPositionZ: 'z',
  particleCount: 'particles',
  windowType: 'inventoryType',
  numberOfSlots: 'slotCount',
  line1: 'text1',
  line2: 'text2',
  line3: 'text3',
  line4: 'text4',
  objectiveValue: 'displayText',
  teamName: 'team',
  teamDisplayName: 'name',
  teamPrefix: 'prefix',
  teamSuffix: 'suffix',
  targetX: 'x',
  targetY: 'y',
  targetZ: 'z',
  feetY: 'y',
  button: 'mouseButton',
  clickedItem: 'item',
  lookedAtBlock: 'block',
  chatMode: 'chatFlags',
  displayedSkinParts: 'skinParts',
  targetPlayer: 'target'
}

function toOldFieldName (fieldName, state, direction, id) {
  if (newToOldFieldNamesSpecific[state] &&
    newToOldFieldNamesSpecific[state][direction] &&
    newToOldFieldNamesSpecific[state][direction][id] &&
    newToOldFieldNamesSpecific[state][direction][id][fieldName]) { return newToOldFieldNamesSpecific[state][direction][id][fieldName] }
  if (newToOldFieldNamesGeneral[fieldName]) { return newToOldFieldNamesGeneral[fieldName] }
  return fieldName
}

function transformFieldName (fieldName, state, direction, id) {
  return toOldFieldName(toCamelCase(fieldName), state, direction, id)
}
