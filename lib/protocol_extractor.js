var WikiTextParser = require('parse-wikitext');
var async=require('async');
var fs = require('fs');

var wikiTextParser = new WikiTextParser("wiki.vg");

var parseWikiTable=require("./common/table_parser").parseWikiTable;
var getFirstTable=require("./common/table_parser").getFirstTable;
var tableToRows=require("./common/table_parser").tableToRows;

module.exports = {
  tableToRows:tableToRows,
  parseWikiTable:parseWikiTable,
  tableToPacket:tableToPacket,
  writeProtocol:writeProtocol,
  writeComments:writeComments
};

function writeComments(protocolFilePath,cb)
{
  async.waterfall([
      getProtocolComments
    ],
    function(err,protocol) {
      if(err)
        return cb(err);
      //console.log(JSON.stringify(protocol,null,2));
      fs.writeFile(protocolFilePath, JSON.stringify(protocol,null,2),cb);
    }
  );
}


function writeProtocol(protocolFilePath,cb)
{
  async.waterfall([
      getProtocol
    ],
    function(err,protocol) {
      if(err)
        return cb(err);
      //console.log(JSON.stringify(protocol,null,2));
      fs.writeFile(protocolFilePath, JSON.stringify(protocol,null,2),cb);
    }
  );
}


function retrieveProtocol(cb)
{
  wikiTextParser.getArticle("Protocol", function(err, data) {
    if(err)
    {
      cb(err);
      return;
    }
    var sectionObject = wikiTextParser.pageToSectionObject(data);
    cb(err,sectionObject);
  });
}

function getProtocol(cb) {
  async.waterfall([
    retrieveProtocol,
    extractProtocol.bind(null, parsePacket),
    transformProtocol.bind(null, transformPacket, transformPacketName)
  ],cb);
}

function getProtocolComments(cb) {
  async.waterfall([
    retrieveProtocol,
    extractProtocol.bind(null, commentsForPacket),
    transformProtocol.bind(null, function(v) { return v; }, transformPacketName)
  ],cb);
}

function extractProtocol(fnPacket, sectionObject,cb)
{
  var notStates = ["content", "Definitions", "Packet format"];

  var protocol = Object
    .keys(sectionObject)
    .filter(function(key) {
      return notStates.indexOf(key) == -1;
    })
    .reduce(function(protocol, state) {
      protocol[state] = Object
        .keys(sectionObject[state])
        .filter(function(key) {
          return key != "content"
        })
        .reduce(function(stateO, direction) {
          stateO[direction] = Object
            .keys(sectionObject[state][direction])
            .filter(function(key) {
              return key != "content"
            })
            .reduce(function(packetsO, packetName) {
              packetsO[packetName] = fnPacket(sectionObject[state][direction][packetName]['content']);
              return packetsO;
            }, {});
          return stateO;
        }, {});
      return protocol;
    }, {});

  cb(null,protocol);
}

function commentsForPacket(packetText) {
  var afterFirstTable = false;
  var inTable = false;
  var table = parseWikiTable(getFirstTable(packetText));
  var id = table.length > 0 && table[0]["Packet ID"] && table[0]["Packet ID"].toLowerCase();
  return packetText.reduce(function(acc, line){
    if(!afterFirstTable && line == '{| class="wikitable"')
      inTable=true;
    else if(inTable && line == ' |}') {
      inTable = false;
      afterFirstTable = true;
    }
    else if(afterFirstTable)
      acc.after.push(line);
    else if (!inTable)
      acc.before.push(line);
    return acc;
  }, { before: [], after: [], id: id });
}

function parsePacket(packetText)
{
  return tableToPacket(parseWikiTable(getFirstTable(packetText)));
}


function tableToPacket(table)
{
  var packet={};
  if(table.length==0 || table[0]["Packet ID"]==undefined)
    return null;
  packet["id"]=table[0]["Packet ID"];
  packet["fields"]=table
    .filter(function(value){
      return !value["Field Name"] || value["Field Name"]!="''no fields''"
    })
    .map(function(value){
    if(value["Field Name"]==undefined || value["Field Type"]==undefined) {
      //console.log(value);
      return null;
    }
    return {
      "name":value["Field Name"],
      "type":value["Field Type"]
    }
  });
  return packet;
}

// transforms
function transformProtocol(transformPacket, transformPacketName, protocol,cb)
{
  var transformedProtocol = Object
    .keys(protocol)
    .reduce(function(transformedProtocol, state) {
      var transformedState=transformState(state);
      transformedProtocol[transformedState] = Object
        .keys(protocol[state])
        .reduce(function(stateO, direction) {
          var transformedDirection=transformDirection(direction);
          stateO[transformedDirection] = Object
            .keys(protocol[state][direction])
            .reduce(function(packetsO, packetName) {
              var transformedPacket=transformPacket(protocol[state][direction][packetName],transformedState,transformedDirection);
              var transformedPacketName=transformPacketName(packetName,transformedState,transformedDirection,transformedPacket ? transformedPacket["id"] : null);
              packetsO.types["packet_" + transformedPacketName] = ['container', transformedPacket.fields];
              packetsO.types.packet[1][0].type[1].mappings[transformedPacket.id] = transformedPacketName;
              packetsO.types.packet[1][1].type[1].fields[transformedPacketName] = "packet_" + transformedPacketName;
              return packetsO;
            }, {types: { packet: ['container', [
              {
                name: "name",
                type: ["mapper", {
                  type: "varint",
                  mappings: {}
                }]
              }, {
                name: "params",
                type: ["switch", {
                  compareTo: "name",
                  fields: {}
                }]
              }
            ]]}});
          return stateO;
        }, {});
      return transformedProtocol;
    }, {});
  transformedProtocol=reorder(["handshaking","status","login","play"],transformedProtocol);
  cb(null,transformedProtocol);
}

function reorder (order, obj) {
  return order.reduce (function (rslt, prop) {
    rslt[prop] = obj[prop];
    return rslt;
  }, {});
}

function transformPacket(packet,state,direction)
{
  if(!packet)
    return null;
  var transformedId=transformId(packet["id"]);
  return {
    "id":transformedId,
    "fields":packet["fields"] ? packet["fields"].map(function(field){return transformField(field,state,direction,transformedId);}) : null
  };
}

function transformId(id)
{
  return id ? id.toLowerCase() : null;
}

function transformField(field,state,direction,id)
{
  return field ? {
    "name":transformFieldName(field["name"],state,direction,id),
    "type":transformFieldType(field["type"])
  } : null;
}


function transformState(state)
{
  return state.toLowerCase();
}

function transformDirection(direction)
{
  if(direction=="Serverbound") return "toServer";
  if(direction=="Clientbound") return "toClient";
}

function toSnakeCase(name)
{
  return name.split(" ").map(function(word){return word.toLowerCase();}).join("_");
}

function toCamelCase(name)
{
  var words=name.split(" ");
  words[0]=words[0].toLowerCase();
  for(i=1;i<words.length;i++) words[i]=words[i].charAt(0).toUpperCase()+words[i].slice(1).toLowerCase();
  return words.join("");
}

var oldNames={
  "handshaking": {
    "toServer": {
      "handshake":"set_protocol"
    }
  },
  "status": {
    "toClient": {
      "response":"server_info",
      "pong":"ping"
    },
    "toServer": {
      "request":"ping_start"
    }
  },
  "login": {
    "toClient": {
      "disconnect":"disconnect",
      "encryption_request":"encryption_begin",
      "login_success":"success",
      "set_compression":"compress"
    },
    "toServer": {
      "encryption_response":"encryption_begin"
    }
  },
  "play": {
    "toClient":{
      "join_game":"login",
      "chat_message":"chat",
      "time_update":"update_time",
      "player_position_and_look":"position",
      "held_item_change":"held_item_slot",
      "use_bed":"bed",
      "spawn_player":"named_entity_spawn",
      "collect_item":"collect",
      "spawn_object":"spawn_entity",
      "spawn_mob":"spawn_entity_living",
      "spawn_painting":"spawn_entity_painting",
      "spawn_experience_orb":"spawn_entity_experience_orb",
      "destroy_entities":"entity_destroy",
      "entity_relative_move":"rel_entity_move",
      "entity_look_and_relative_move":"entity_move_look",
      "entity_head_look":"entity_head_rotation",
      "set_experience":"experience",
      "entity_properties":"entity_update_attributes",
      "chunk_data":"map_chunk",
      "effect":"world_event",
      "particle":"world_particles",
      "change_game_state":"game_state_change",
      "spawn_global_entity":"spawn_entity_weather",
      "window_property":"craft_progress_bar",
      "confirm_transaction":"transaction",
      "update_block_entity":"tile_entity_data",
      "open_sign_editor":"open_sign_entity",
      "player_list_item":"player_info",
      "player_abilities":"abilities",
      "update_score":"scoreboard_score",
      "display_scoreboard":"scoreboard_display_objective",
      "plugin_message":"custom_payload",
      "disconnect":"kick_disconnect",
      "server_difficulty":"difficulty",
      "player_list_header_and_footer":"playerlist_header"
    },
    "toServer": {
      "chat_message":"chat",
      "player":"flying",
      "player_position":"position",
      "player_look":"look",
      "player_position_and_look":"position_look",
      "player_digging":"block_dig",
      "player_block_placement":"block_place",
      "held_item_change":"held_item_slot",
      "animation":"arm_animation",
      "click_window":"window_click",
      "confirm_transaction":"transaction",
      "creative_inventory_action":"set_creative_slot",
      "player_abilities":"abilities",
      "client_settings":"settings",
      "client_status":"client_command",
      "plugin_message":"custom_payload",
      "resource_pack_status":"resource_pack_receive"
    }
  }
};

function toOldNames(name,state,direction)
{
  var x = oldNames[state] && oldNames[state][direction] && oldNames[state][direction][name] ? oldNames[state][direction][name] : name;
  console.log(state, direction, name, x);
  return x;
}

function transformPacketName(packetName,state,direction,id)
{
  return toOldNames(toSnakeCase(packetName).replace("-", "_").replace(/_\(.+\)$/, ""),state,direction,id);
}

function transformFieldType(fieldType)
{
  fieldType=fieldType.toLowerCase().replace("unsigned ","u").replace("boolean","bool").replace("[[chat]]","string")
    .replace("angle","byte").replace("uuid","UUID");
  if(fieldType.indexOf("varint")!=-1) return "varint";
  if(fieldType.indexOf("slot")!=-1) return "slot";
  if(fieldType.indexOf("entity metadata")!=-1) return "entityMetadata";
  if(fieldType.indexOf("nbt")!=-1) return "restBuffer";
  if(fieldType.indexOf("ubyte")!=-1) return "u8";
  if(fieldType.indexOf("byte")!=-1) return "i8";
  if(fieldType.indexOf("ushort")!=-1) return "u16";
  if(fieldType.indexOf("short")!=-1) return "i16";
  if(fieldType.indexOf("uint")!=-1) return "u32";
  if(fieldType.indexOf("int")!=-1) return "i32";
  if(fieldType.indexOf("ulong")!=-1) return "u64";
  if(fieldType.indexOf("long")!=-1) return "i64";
  return fieldType;
}

// specific has priority over general

// specific
var newToOldFieldNamesSpecific={
  "status":{
    "toClient":{
      "0x01":{
        "payload":"time"
      }
    },
    "toServer":{
      "0x01":{
        "payload":"time"
      }
    }
  },
  "login": {
    "toServer": {
      "0x00":{
        "name":"username"
      }
    }
  },
  "play": {
    "toClient": {
      "0x01":{
        "gamemode":"gameMode"
      },
      "0x0e":{
        "data":"objectData"
      },
      "0x21":{
        "data":"chunkData"
      },
      "0x2b":{
        "value":"gameMode"
      },
      "0x2f":{
        "slotData":"item"
      },
      "0x30":{
        "slotData":"items"
      },
      "0x32":{
        "actionNumber":"action"
      },
      "0x3b":{
        "mode":"action",
        "objectiveName":"name"
      },
      "0x3c":{
        "scoreName":"itemName",
        "objectiveName":"scoreName"
      },
      "0x3d":{
        "scoreName":"name"
      }
    },
    "toServer":{
      "0x02":{
        "type":"mouse"
      },
      "0x08":{
        "face":"direction",
        "cursorPositionX":"cursorX",
        "cursorPositionY":"cursorY",
        "cursorPositionZ":"cursorZ"
      },
      "0x09":{
        "slot":"slotId"
      },
      "0x0b":{
        "payload":"actionId"
      },
      "0x0c":{
        "flags":"jump"
      },
      "0x0e":{
        "actionNumber":"action"
      },
      "0x0f":{
        "actionNumber":"action"
      },
      "0x16":{
        "actionId":"payload"
      }
    }
  }
};

// should probably be converted entirely in the specific format
// general
var newToOldFieldNamesGeneral={
  "serverAddress":"serverHost",
  "jsonResponse":"response",
  "jsonData":"message",
  "worldAge":"age",
  "timeOfDay":"time",
  "playerUuid":"playerUUID",
  "deltaX":"dX",
  "deltaY":"dY",
  "deltaZ":"dZ",
  "chunkX":"x",
  "chunkZ":"z",
  "ground-upContinuous":"groundUp",
  "primaryBitMask":"bitMap",
  "size":"chunkDataLength",
  "blockId":"type",
  "blockType":"blockId",
  "recordCount":"count",
  "records":"affectedBlockOffsets",
  "disableRelativeVolume":"global",
  "effectPositionX":"x",
  "effectPositionY":"y",
  "effectPositionZ":"z",
  "particleCount":"particles",
  "windowType":"inventoryType",
  "numberOfSlots":"slotCount",
  "line1":"text1",
  "line2":"text2",
  "line3":"text3",
  "line4":"text4",
  "objectiveValue":"displayText",
  "teamName":"team",
  "teamDisplayName":"name",
  "teamPrefix":"prefix",
  "teamSuffix":"suffix",
  "targetX":"x",
  "targetY":"y",
  "targetZ":"z",
  "feetY":"y",
  "button":"mouseButton",
  "clickedItem":"item",
  "lookedAtBlock":"block",
  "chatMode":"chatFlags",
  "displayedSkinParts":"skinParts",
  "targetPlayer":"target"
};

function toOldFieldName(fieldName,state,direction,id)
{
  if(newToOldFieldNamesSpecific[state]
    && newToOldFieldNamesSpecific[state][direction]
    && newToOldFieldNamesSpecific[state][direction][id]
    && newToOldFieldNamesSpecific[state][direction][id][fieldName])
    return newToOldFieldNamesSpecific[state][direction][id][fieldName];
  if(newToOldFieldNamesGeneral[fieldName])
    return newToOldFieldNamesGeneral[fieldName];
  return fieldName;
}

function transformFieldName(fieldName,state,direction,id)
{
  return toOldFieldName(toCamelCase(fieldName),state,direction,id);
}

