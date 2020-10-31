const WikiTextParser = require('parse-wikitext')
const fs = require('fs')

const wikiTextParser = new WikiTextParser('wiki.vg')

module.exports = { writeAllEntities: writeAllEntities, getEntities: getEntities }

const tableParser = require('./common/table_parser')

function getEntities (date, cb) {
  wikiTextParser.getFixedArticle('Entity_metadata', date, function (err, pageData, title) {
    if (err) {
      cb(err)
      return
    }
    const sectionObject = wikiTextParser.pageToSectionObject(pageData)
    const mobs = sectionObject.Mobs.content
    const objects = sectionObject.Objects.content

    let parsedMobs = tableParser.parseWikiTable(tableParser.getFirstTable(mobs))
    let parsedObjects = tableParser.parseWikiTable(tableParser.getFirstTable(objects))

    function transformSize (size) {
      if (size === 'N/A') { return null }
      let r = size.match(/^(.+?) \* size/)
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

    const entities = parsedMobs.concat(parsedObjects)

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
