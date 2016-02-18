var table_parser = require("../").table_parser;
var assert=require("assert");

describe("parse wikitable",function(){
  it("Handle colspan",function(){
    var testTable=         "{| class=\"wikitable\"\n"+
      "|-\n"+
      "! style=\"width: 75px\" | Index\n"+
      "! style=\"width: 75px\" | Type\n"+
      "! style=\"width: 250px\" colspan=\"2\" | Meaning\n"+
      "|-\n"+
      "| rowspan=\"6\" | 16\n"+
      "| rowspan=\"6\" | Int\n"+
      "! Value !! Profession \n"+
      "|-\n"+
      "| 0 || Farmer\n"+
      "|-\n"+
      "| 1 || Librarian \n"+
      "|-\n"+
      "| 2 || Priest\n"+
      "|-\n"+
      "| 3 || Blacksmith\n"+
      "|-\n"+
      "| 4 || Butcher\n"+
      "|}";

    var expectedTable=[
      {
        "Index":"16",
        "Type":"Int",
        "Meaning":{"Value":"0","Profession":"Farmer"}
      },
      {
        "Index":"16",
        "Type":"Int",
        "Meaning":{"Value":"1","Profession":"Librarian"}
      },
      {
        "Index":"16",
        "Type":"Int",
        "Meaning":{"Value":"2","Profession":"Priest"}
      },
      {
        "Index":"16",
        "Type":"Int",
        "Meaning":{"Value":"3","Profession":"Blacksmith"}
      },
      {
        "Index":"16",
        "Type":"Int",
        "Meaning":{"Value":"4","Profession":"Butcher"}
      }
    ];

    var actualTable=table_parser.parseWikiTable(testTable.split("\n"));


    assert.deepEqual(actualTable,expectedTable);

  });

  it("Handle more complicated colspan",function(){
    var testTable="{| class=\"wikitable\"\n"+
      "|-\n"+
      "! style=\"width: 75px\" | Index\n"+
      "! style=\"width: 75px\" | Type\n"+
      "! style=\"width: 250px\" colspan=\"3\"| Meaning\n"+
      "|-\n"+
      "| rowspan=\"19\" | 16\n"+
      "| rowspan=\"19\" | Byte\n"+
      "! Bit Mask \n"+
      "! colspan=\"2\" | Meaning\n"+
      "|-\n"+
      "| rowspan=\"17\" | 0x0F\n"+
      "! Value !! Color\n"+
      "|-\n"+
      "| 0 || White\n"+
      "|-\n"+
      "| 1 || Orange\n"+
      "|-\n"+
      "| 2 || Magenta\n"+
      "|-\n"+
      "| 3 || Light Blue\n"+
      "|-\n"+
      "| 4 || Yellow\n"+
      "|-\n"+
      "| 5 || Lime\n"+
      "|-\n"+
      "| 6 || Pink\n"+
      "|-\n"+
      "| 7 || Gray\n"+
      "|-\n"+
      "| 8 || Silver\n"+
      "|-\n"+
      "| 9 || Cyan\n"+
      "|-\n"+
      "| 10 || Purple\n"+
      "|-\n"+
      "| 11 || Blue\n"+
      "|-\n"+
      "| 12 || Brown\n"+
      "|-\n"+
      "| 13 || Green\n"+
      "|-\n"+
      "| 14 || Red\n"+
      "|-\n"+
      "| 15 || Black\n"+
      "|-\n"+
      "| 0x10 \n"+
      "| colspan=\"2\" | Is Sheared\n"+
      "|}\n";
    var expectedTable=[
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"0",
            "Color":"White"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"1",
            "Color":"Orange"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"2",
            "Color":"Magenta"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"3",
            "Color":"Light Blue"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"4",
            "Color":"Yellow"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"5",
            "Color":"Lime"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"6",
            "Color":"Pink"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"7",
            "Color":"Gray"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"8",
            "Color":"Silver"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"9",
            "Color":"Cyan"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"10",
            "Color":"Purple"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"11",
            "Color":"Blue"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"12",
            "Color":"Brown"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"13",
            "Color":"Green"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"14",
            "Color":"Red"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x0F",
          "Meaning":{
            "Value":"15",
            "Color":"Black"
          }
        }
      },
      {
        "Index":"16",
        "Type":"Byte",
        "Meaning": {
          "Bit Mask":"0x10",
          "Meaning":"Is Sheared"
        }
      }
    ];

    var actualTable=table_parser.parseWikiTable(testTable.split("\n"));


    assert.deepEqual(actualTable,expectedTable);
  });
});