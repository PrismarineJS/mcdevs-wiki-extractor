var WikiTextParser = require('parse-wikitext');
var fs = require('fs');

var wikiTextParser = new WikiTextParser('wiki.vg');

module.exports={writeAllEntities:writeAllEntities,getEntities:getEntities};

var table_parser=require("./common/table_parser");

function getEntities(date,cb)
{
  wikiTextParser.getFixedArticle("Entities",date,function(err,pageData,title){
    var sectionObject=wikiTextParser.pageToSectionObject(pageData);
    var mobs=sectionObject["Mobs"].content;
    var objects=sectionObject["Objects"].content;

    var parsed_mobs=table_parser.parseWikiTable(table_parser.getFirstTable(mobs));
    var parsed_objects=table_parser.parseWikiTable(table_parser.getFirstTable(objects));

    function transformSize(size) {
      if(size == 'N/A')
        return null;
      var r;
      if(r=size.match(/^(.+?) \* size/))
      {
        return parseFloat(r[1]);
      }
      if(r=size.match(/^(.+?) \* (.+?)/))
      {
        return parseFloat(r[1])*parseFloat(r[2]);
      }
      return parseFloat(size);
    }

    parsed_mobs=parsed_mobs.map(function(val){
      return {
        id:parseInt(val["Type"]),
        displayName:val["Name"],
        width:transformSize(val["x, z"]),
        height:transformSize(val["y"]),
        type:"mob"
      }
    });

    parsed_objects=parsed_objects.map(function(val){
      return {
        id:parseInt(val["ID"]),
        displayName:val["Name"],
        width:transformSize(val["x, z"]),
        height:transformSize(val["y"]),
        type:"object"
      }
    });

    var entities=parsed_mobs.concat(parsed_objects);


    cb(null,entities);
  });
}

function writeAllEntities(file,date, cb)
{
  getEntities(date,function(err,entities){
    fs.writeFile(file, JSON.stringify(entities,null,2), cb);
  });
}
