#!/usr/bin/node
var pandoc = require('pandoc-filter');
var Link = pandoc.Link;
var toOldNames = require("./common/toOldNames").transformPacketName;

function relink(key, value, format, meta) {
  if (key == 'Link' && value[2][0].indexOf("#") === 0)
    return Link(value[0], value[1], ["#" + toOldNames(value[2][0].substr(1)), value[2][1]]);
}

pandoc.stdio(relink);
