"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var babylon = require("babylon");
var types = require("babel-types");

var startScript = /<script[^>]*>/im;
var endScript = /<\/script\s*>/im;

function getCandidateScriptLocations(source, index) {
  var i = index || 0;
  var str = source.substring(i);

  var startMatch = startScript.exec(str);
  if (startMatch) {
    var startsAt = startMatch.index + startMatch[0].length;
    var afterStart = str.substring(startsAt);
    var endMatch = endScript.exec(afterStart);
    if (endMatch) {
      var locLength = endMatch.index;
      var locIndex = i + startsAt;

      return [adjustForLineAndColumn(source, {
        index: locIndex,
        length: locLength,
        source: source.substring(locIndex, locIndex + locLength)
      })].concat(_toConsumableArray(getCandidateScriptLocations(source, locIndex + locLength + endMatch[0].length)));
    }
  }

  return [];
}

function parseScript(_ref) {
  var source = _ref.source,
      line = _ref.line;

  // remove empty or only whitespace scripts
  if (source.length === 0 || /^\s+$/.test(source)) {
    return null;
  }

  try {
    return babylon.parse(source, {
      sourceType: "script",
      startLine: line
    });
  } catch (e) {
    return null;
  }
}

function parseScripts(locations) {
  var parser = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : parseScript;

  return locations.map(parser);
}

function generateWhitespace(length) {
  return Array.from(new Array(length + 1)).join(" ");
}

function calcLineAndColumn(source, index) {
  var lines = source.substring(0, index).replace(/\r\l?/, "\n").split(/\n/);
  var line = lines.length;
  var column = lines.pop().length + 1;

  return {
    column: column,
    line: line
  };
}

function adjustForLineAndColumn(fullSource, location) {
  var _calcLineAndColumn = calcLineAndColumn(fullSource, location.index),
      column = _calcLineAndColumn.column,
      line = _calcLineAndColumn.line;

  return Object.assign({}, location, {
    line: line,
    column: column,
    // prepend whitespace for scripts that do not start on the first column
    source: generateWhitespace(column) + location.source
  });
}

function parseScriptTags(source, parser) {
  var scripts = parseScripts(getCandidateScriptLocations(source), parser).filter(types.isFile).reduce(function (main, script) {
    return {
      statements: main.statements.concat(script.program.body),
      comments: main.comments.concat(script.comments),
      tokens: main.tokens.concat(script.tokens)
    };
  }, {
    statements: [],
    comments: [],
    tokens: []
  });

  var program = types.program(scripts.statements);
  var file = types.file(program, scripts.comments, scripts.tokens);

  var end = calcLineAndColumn(source, source.length);
  file.start = program.start = 0;
  file.end = program.end = source.length;
  file.loc = program.loc = {
    start: {
      line: 1,
      column: 0
    },
    end: end
  };

  return file;
}

function extractScriptTags(source) {
  return parseScripts(getCandidateScriptLocations(source), function (loc) {
    var ast = parseScript(loc);

    if (ast) {
      return loc;
    }

    return null;
  }).filter(types.isFile);
}

exports.default = parseScriptTags;
exports.extractScriptTags = extractScriptTags;
exports.generateWhitespace = generateWhitespace;
exports.getCandidateScriptLocations = getCandidateScriptLocations;
exports.parseScript = parseScript;
exports.parseScripts = parseScripts;
exports.parseScriptTags = parseScriptTags;