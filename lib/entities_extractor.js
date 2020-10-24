var WikiTextParser = require('parse-wikitext')
var fs = require('fs')

var wikiTextParser = new WikiTextParser('wiki.vg')

module.exports = { writeAllEntities: writeAllEntities, getEntities: getEntities }

var tableParser = require('./common/table_parser')

function getEntities (date, cb) {
  wikiTextParser.getFixedArticle('Entity_metadata', date, function (err, pageData, title) {
    if (err) {
      cb(err)
      return
    }
    var sectionObject = wikiTextParser.pageToSectionObject(pageData)
    var mobs = sectionObject.Mobs.content
    var objects = sectionObject.Objects.content

    var parsedMobs = tableParser.parseWikiTable(tableParser.getFirstTable(mobs))
    var parsedObjects = tableParser.parseWikiTable(tableParser.getFirstTable(objects))

    function transformSize (size) {
      if (size === 'N/A') { return null }
      var r = size.match(/^(.+?) \* size/)
      if (r) {
        return parseFloat(r[1])
      }
      r = size.match(/^(.+?) \* (.+?)/)
      if (r) {
        return parseFloat(r[1]) * parseFloat(r[2])
      }
      return parseFloat(size)
    }

    parsedMobs = parsedMobs.map(function (val) {
      return {
        id: parseInt(val.Type),
        internalId: parseInt(val.Type),
        name: val.ID ? val.ID.replace(/<code>(.+)<\/code>/, '$1').replace(/minecraft:/g, '') : undefined,
        displayName: val.Name,
        width: transformSize(val['bounding box x and z']),
        height: transformSize(val['bounding box y']),
        type: 'mob'
      }
    })

    parsedObjects = parsedObjects.map(function (val) {
      return {
        id: parseInt(val.ID),
        internalId: parseInt(val.ID),
        name: val.Name.replace(/\(.+?\)/, '').trim().replace(/ /, '_').toLowerCase(),
        displayName: val.Name,
        width: transformSize(val['bounding box x and z']),
        height: transformSize(val['bounding box y']),
        type: 'object'
      }
    })

    var entities = parsedMobs.concat(parsedObjects)

    cb(null, entities)
  })
}

function writeAllEntities (file, date, cb) {
  getEntities(date, function (err, entities) {
    if (err) {
      cb(err)
      return
    }
    fs.writeFile(file, JSON.stringify(entities, null, 2), cb)
  })
}
