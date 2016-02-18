var WikiTextParser = require('parse-wikitext');
var fs = require('fs');

var wikiTextParser = new WikiTextParser('wiki.vg');

module.exports={writeAllEntityMetadata:writeAllEntityMetadata,getEntityMetadata:getEntityMetadata};

var table_parser=require("./common/table_parser");

function getEntityMetadata(date,cb)
{
  wikiTextParser.getFixedArticle("Entities",date,function(err,pageData,title){
    var sectionObject=wikiTextParser.pageToSectionObject(pageData);
    var entities=Object.keys(sectionObject["Entity Metadata"]).filter(function(section){return section!="Entity Metadata Format" && section!="content"});

    entities.forEach(function(entity){
      var content=sectionObject["Entity Metadata"][entity].content;
      var tab=table_parser.parseWikiTable(table_parser.getFirstTable(content));
      console.log(entity);
      console.log(tab);
    });

    cb(null,[]);
  });
}

function writeAllEntityMetadata(file,date, cb)
{
  getEntityMetadata(date,function(err,entities){
    fs.writeFile(file, JSON.stringify(entities,null,2), cb);
  });
}
