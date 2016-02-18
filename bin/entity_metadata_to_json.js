if(process.argv.length <3 || process.argv.length >4) {
  console.log("Usage : node entity_metadata_to_json.js <entity_metadata.json> [<wikidate>]");
  process.exit(1);
}
var entityMetadataFilePath=process.argv[2];
var date=process.argv[3] ? process.argv[3] : "2015-07-11T00:00:00Z";

var writeAllEntityMetadata=require("../lib/entity_metadata_extractor").writeAllEntityMetadata;

writeAllEntityMetadata(entityMetadataFilePath,date,function(err){
  if(err) {
    console.log(err.stack);
    return;
  }
  console.log("Entity metadata extracted !");
});