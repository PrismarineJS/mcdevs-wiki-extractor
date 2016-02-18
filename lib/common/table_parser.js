module.exports={
  getFirstTable:getFirstTable,
  parseWikiTable:parseWikiTable,
  tableToRows:tableToRows
};

function getFirstTable(lines)
{
  var afterFirstTable=false;
  var inTable=false;
  return lines.filter(function(line){
    if(afterFirstTable) return false;
    if(line == '{| class="wikitable"')
      inTable=true;

    if(inTable && line == ' |}') {
      inTable = false;
      afterFirstTable = true;
      return true;
    }

    return inTable;
  });
}

function splitTableLine(line)
{
  var result=[];
  var parts;
  if(line.indexOf("||")!=-1) {
    parts = line.split("||");
    result.push(parts[0]);
    parts.slice(1)
      .map(function (s) {
        return "|" + s;
      })
      .forEach(function (s) {
        result.push(s)
      });
  }
  else if(line.indexOf("!!")!=-1) {
    parts = line.split("!!");
    result.push(parts[0]);
    parts.slice(1)
      .map(function (s) {
        return "!" + s;
      })
      .forEach(function (s) {
        result.push(s)
      });
  }
  else
    result.push(line);
  return result;
}

function tableToRows(lines)
{
  lines=lines.slice(1);
  if(lines.length==0)
    return [];
  if(lines[0].trim()=="|-")
    lines.shift();
  var rows=[];
  var currentRow=[];
  lines.forEach(function(line){
    if(line.trim()=="|-" || line.trim() == "|}")
    {
      rows.push(currentRow);
      currentRow=[];
    }
    else {
      var parts=splitTableLine(line);
      parts.forEach(function(part){
        currentRow.push(part);
      })
    }
  });
  if(currentRow.length!=0 && currentRow[0].trim()!="") rows.push(currentRow);
  return rows;
}

// algo:
// input is output of tableToRows, test that tableToRows allows output the right type ?
// Input : (Row) list
// Row : (Value or Title) list
// update the current cols at each element iteration
// if row contains Title : update title row, no new value
// titles is a recursive structure containing all current level of columns


// output format : one object by line, repetition of the row in case of rowspan>1 (for example repetition of Packet Id)
// for colspan>1 : [first element,second element] or {colName:first element,...} if ! are given
// need to implement colspan
function rowsToSimpleRows(rows)
{
  // for recursive arrays ( / colspan ) : have a currentCols : no : rec
  var rawCols=rows[0];
  if(!rawCols)
    return [];
  var colspans=[];
  var colNames=rawCols.map(function(rawCol){
    return rawCol.split("!")[1].trim();
  }).map(function(raw){
    if(raw.indexOf("|")!=-1) {
      var parts=raw.split("|");
      var name=parts[1].trim();
      var firstPart=parts[0].trim();
      if(firstPart.indexOf("colspan")!=-1)
        colspans.push(parseInt(firstPart.replace(/^.*colspan="([0-9]+)".*/,'$1')));
      else colspans.push(1);
      return name;
    }
    colspans.push(1);
    return raw;
  });
  console.log(colspans);

  // for rowspan
  var currentValues={};
  var currentCols=null;
  return rows.slice(1).map(function(row)
  {
    var currentColValue="";
    var currentColRemaining=0;

    var colToAdd=colNames.length-row.length;
    var i;
    for(i=0;i<colToAdd;i++) if(currentValues[i]!==undefined && currentValues[i].n>0) row.unshift("");
    var fields=[];
    for(i=0;i<row.length;i++)
    {
      var col=row[i];
      col=col.substring(2);
      var parts,value,n;
      console.log("col",col);

      currentColRemaining=colspans[i];
      if(col.indexOf("colspan")!=-1)
      {
        //console.log("colspan "+col);
        parts=col.split("|");
        value=parts[1].trim();
        n=parts[0].replace(/^.*colspan="([0-9]+)".*/,'$1');
        currentColValue=value;
        currentColRemaining=n;
      }
      else if(col.indexOf("rowspan")!=-1)
      {
        parts=col.split("|");
        value=parts[1].trim();
        n=parts[0].replace(/^.*rowspan="([0-9]+)".*/,'$1');
        currentValues[i]={n:n,value:value};
      }
      if(currentValues[i]!==undefined && currentValues[i].n>0)
      {
        currentValues[i].n--;
        fields.push(currentValues[i].value);
      }
      else if(currentColRemaining!=0)
      {
        while(currentColRemaining>0)
        {
          fields.push(currentColValue);
          currentColRemaining--;
        }
      }
      else fields.push(col.trim());
    }
    return fields.reduce(function(values,value,i){
      if(values==null)
        return null;
       if(colNames[i])
        values[colNames[i]]=value;
      return values;
    },{});
  })
    .filter(function(a){
      return a!=null;
    });
}


function parseWikiTable(lines)
{
  var rows=tableToRows(lines);
  console.log(rows);
  return rowsToSimpleRows(rows);
}

/*
 // remove that ugly hack
 if(value.indexOf("!!")!=-1) {
 currentCols = value.split("!!").map(function (a) {
 return a.trim()
 });
 return null;
 }
 else if(currentCols!=null && value.indexOf("||")!=-1)
 values[colNames[i]]=value.split('||').reduce(function(values,value,i){
 values[currentCols[i]]=value.trim();
 return values;
 },{});
 else */