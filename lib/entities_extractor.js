var WikiTextParser = require('parse-wikitext');
var fs = require('fs');

var wikiTextParser = new WikiTextParser('wiki.vg');

module.exports={writeAllEntities:writeAllEntities};

var table_parser=require("./common/table_parser");

function writeAllEntities(file,date, cb)
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
        return r[1];
      }
      return size;
    }

    parsed_mobs=parsed_mobs.map(function(val){
      return {
        id:val["Type"],
        displayName:val["Name"],
        width:transformSize(val["x, z"]),
        height:transformSize(val["y"]),
        type:"mob"
      }
    });

    parsed_objects=parsed_objects.map(function(val){
      return {
        id:val["ID"],
        displayName:val["Name"],
        width:transformSize(val["x, z"]),
        height:transformSize(val["y"]),
        type:"object"
      }
    });

    var entities=parsed_mobs.concat(parsed_objects);

    console.log(entities);


    fs.writeFile(file, JSON.stringify(entities,null,2), cb);
  });
}
