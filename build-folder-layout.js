#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const child = require("child_process");

let minimatch;
try {
  minimatch = require('minimatch');
} catch (ex) {
  if (typeof(minimatch) === 'undefined') {
    try {
      child.execSync("npm install -g minimatch");
      minimatch = require('minimatch');  
    } catch(ex1) {
      try {
        child.execSync("npm install --save-dev minimatch");
        minimatch = require('minimatch');  
      } catch(ex2) { }
    }
  }
}

const globals = {};

function sutSplit(string, delimiters) {
  delimiters = (Array.isArray(delimiters) ? delimiters : Array.from(arguments).split(1));
  const split = string.split(delimiters.unshift());
  for (const delimiter of delimiters) {
    result.concat(string.split(delimiter));
  }
  return split;
}

// Return a list of files of the specified fileTypes in the provided dir, 
// with the file path relative to the given dir
// dir: path of the directory you want to search the files for
// fileTypes: array of file types you are search files, ex: ['.txt', '.jpg']
function getFilesFromDir(fileTypes, dir = ".") {
  let filesToReturn = [];
  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    for (var i in files) {
      var curFile = path.join(currentPath, files[i]);      
      if (fs.statSync(curFile).isFile()) {
        if (minimatch(path.basename(curFile), fileTypes)) {
            filesToReturn.push(curFile);
        }
      } else if (fs.statSync(curFile).isDirectory()) {
       walkDir(curFile);
      }
    }
  };
  walkDir(dir);
  return filesToReturn; 
}

//************************************************************************************** */
//* Get Functions                                                                        */
//************************************************************************************** */
globals.getFiles = function(path) {
  if (typeof(path) !== 'string' || fs.existsSync(path)) {
    return path; // If getFiles is passed an array, assume files have already been found.
  }
  const fileTypes = path.basename(path);
  const dir = path.dirname(path.normalize(path));
  let foundPaths;
  try {
    foundPaths = getFilesFromDir(fileTypes, dir);
  } catch (ex) {
    console.error("While finding files, ", path, " cound not be found. ", ex);
    foundPaths = [];
  }
  if (foundPaths.length > 1) {
    return foundPaths;
  } else if (typeof(foundPaths[0]) === 'undefined') {
    return path; // Path exists, but no files could be found... Assume path is ok as-is.
  }
  return foundPaths[0];
}

globals.match = function(pattern, value) {
  const regex = new RegExp(pattern);
  return regex.test(value);
}

function getExecPath(exec) {
  let result;
  try {
    result = child.execSync("which " + exec, {stdio: [process.stdin, process.stdout]}).toString().trim();
  } catch(ex) {
    try {
      result = child.execSync("where " + exec, {stdio: [process.stdin, process.stdout]}).toString().trim();
    } catch(ex2) {
      return;
    }
  }
  if (result.toLowerCase().indexOf("command not found") !== -1 || result.toLowerCase().indexOf("could not find files") !== -1) {
    return;
  }
  return result;
}

globals.isExec = function(value) {
  value = value.split(" ")[0];
  if (process.platform === "win32") {
    switch(Path.GetExtension(value).toLowerCase()) {
      case "exe": case "bat": case "cmd": case "vbs": case "ps1": {
        return true;
      }
    }
  }
  try {
    // Check if linux has execution rights
    fs.accessSync(value, fs.constants.X_OK);
    return true;
  } catch(ex) {
  }
  // Exists on the system path
  return typeof(getExecPath(value)) !== 'undefined';
}

globals.isProbablyFile = function(value) {
  return value.startsWith(".") && !value.endsWith(".");
}

globals.isProbablyDirectory = function(value) {
  return value.endsWith(".");
}

//************************************************************************************** */
//* Action Functions                                                                     */
//************************************************************************************** */

globals.fail = function() {
  return false;
}

globals.success = function() {
  return true;
}

globals.runCommand = function(itemCommand, ignoreFailure = false) {
  try {
      child.execSync(itemCommand);
      return true;
  } catch(ex) {
  }
  return ignoreFailure;
}

// Path should always end with /. or a /filename.extension.
//   /path/ refers to all files within a path. It is not a path.
//   /path refers only to a file. This file could also be a directory.
//
// Returns true to continue processing only if a new path is created.
globals.mkdir = function(dirPath) {
  try {
    fs.mkdirSync(path.relative("./.", path.normalize(path.resolve(path.dirname(dirPath)))));
  } catch(e) {
    return false;
    //if (e.code !== "EEXIST") {
    //  return false;
    //}
  }
  return true;
}

// Only returns true to continue processing if a new file is written.
globals.touch = function(path) {
  globals.mkdir(path);
  const now = Date.now();
  try {
    fs.utimesSync(path, now, now); // Update last modified date
  } catch (ex) {
    fs.closeSync(fs.openSync(path, 'w'));
    return true; // New blank file was created...return success (and possibly continue processing)
  }
  return false;
}

globals.copy = function(source, destination, copied = []) {
  source = globals.getFiles(source);
  if (typeof(source) !== 'string' || typeof(destination) !== 'string') {
    for (let destKey in (typeof(destionation) === 'object' ? destionation : [destination])) {
      const dest = destionation[destKey];
      for (let srcKey in (typeof(source) === 'object' ? source : [source])) {
        const src = source[srcKey];
        globals.copyFiles(src, dest);
      }
    }
    return (Array.isArray(copied) && copied.length > 0 ? copied : undefined);
  }
  globals.mkdir(destination);
  if (source === destination) {
    try {
      fs.closeSync(fs.openSync(destination, 'w')); // Update last modified date
    } catch (ex) {}
    return (Array.isArray(copied) && copied.length > 0 ? copied : undefined);
  }
  try {
    fs.copyFile(source, destionation);
    copied.push(source);
  } catch(ex) {
    console.error("Unable to copy file ", source, " -> ", destionation, " ", err)
  }
  return (Array.isArray(copied) && copied.length > 0 ? copied : undefined);
}

globals.remove = function(path) {
  path = globals.getFiles(path);
  if (typeof(path) !== 'string') {
    let removed = false;
    for (let pathKey in path) {
      const pathItem = path[pathKey];
      removed = globals.remove(pathItem) || removed;
    }
    return removed;
  }  
  if (typeof(file) === 'string') {
    try {
      fs.unlinkSync(file);
      return true;
    } catch (ex) {
      console.error("Unable to delete file ", file, " ", ex);
    }
  }
  return false;
}

globals.move = function(source, destination) {
  let moved = false;
  for (let copiedFile of globals.copy(source, destination)) {
    if (globals.remove(copiedFile)) {
      movied = true;
    }
  }
  return moved;
}

//************************************************************************************** */
//* Reflection - Dynamic variable substitution and function execution                    */
//************************************************************************************** */

function getVariable(name, scope, globalScope) {
  if (typeof(scope) !== 'undefined' && typeof(scope[name]) !== 'undefined') {
    return scope[name];
  }
  if (typeof(globalScope) !== 'undefined' && typeof(globalScope[name]) !== 'undefined') {
    return globalScope[name];
  }
  return undefined;
}

function trySubstitutingVariable(variable, scope = this, globalScope = globals) {
  if (variable.indexOf("$") === -1) {
    return variable;
  }
  const argParts = variable.split(/(?=[^A-Za-z0-9]+)/g);
  for (let partIndex = 0; partIndex < argParts.length; partIndex++) {
    if (argParts[partIndex] === "$" && partIndex < argParts.length - 2 &&  argParts[partIndex + 1].startsWith("{") && argParts[partIndex + 2] === "}") { // Assume ${variable}
      argParts.splice(partIndex, 1); // remove $
      argParts[partIndex] = argParts[partIndex].substring(1); // remove {
      argParts.splice(partIndex + 1, 1) // remove }
    } else if (argParts[partIndex].startsWith("$") && argParts[partIndex].length > 1) {
      argParts[partIndex] = argParts[partIndex].substring(1);
    } else {
      continue;
    }
    argParts[partIndex] = getVariable(argParts[partIndex], scope, globalScope);
  }
  return argParts.join("");
}

function runFunction(callbackFunc, scope) {
  const func = callbackFunc[0];
  const args = Array.from(callbackFunc.length === 2 && Array.isArray(callbackFunc[1]) ? callbackFunc[1] : Array.from(callbackFunc).slice(1));
  for (let argIndex in args) {
    args[argIndex] = trySubstitutingVariable(args[argIndex], scope);
  }
  return func.apply(scope, args);
}

function func(callback, args = []) {
  if (arguments.length === 2 && Array.isArray(arguments[1])) {
    return [callback, args];
  }
  return [arguments[0], Array.from(arguments).slice(1)];
}

//************************************************************************************** */
//* Lookup Commands                                                                      */
//************************************************************************************** */

const defaultCommands = [
  { "getFiles": func(globals.getFiles,   "$value") },
  { "mkdir":    func(globals.mkdir,      "$value") },
  { "touch":    func(globals.touch,      "$value") },
  { "copy":     func(globals.copy,       "$source", "$value" )},
  { "mv":       func(globals.move,       "$source", "$value" )},
  { "rm":       func(globals.remove,     "$value") },
  { "exec":     func(globals.runCommand, "$value") },
  { "link":     func(globals.link,       "$value") }, // TODO: Use Atom file-system-watcher to emulate link, when links are not available
  { "logerror": func(globals.log,        "$value") }
];

const defaultPatternAliases = [
  { "getFiles": func(globals.match,               "\\*\\.(\\*|[a-zA-Z0-9]+)$", "$value") }, // TODO: Get this working later...matches wild cards
  { "exec":     func(globals.isExec,              "$value") },
  { "touch":    func(globals.isProbablyFile,      "$value") },
  { "mkdir":    func(globals.isProbablyDirectory, "$value") },
  { "logerror": func(globals.success) }
];

//************************************************************************************** */
//* Process Folder Layout                                                                */
//************************************************************************************** */

function getCommand(layoutCommand) {
  const commandId = layoutCommand.split(" ")[0];
  if (defaultCommands.some(function(item) { return typeof(item[commandId]) !== 'undefined' } )) {
    return commandId;
  }
  return;
}

function getAlias(layoutCommand) {
  let result = false;
  this.value = layoutCommand;
  for (let aliasKey in defaultPatternAliases) {
    const aliasMatch = defaultPatternAliases[aliasKey];
    for (let alias in aliasMatch) {
      if (runFunction(aliasMatch[alias], this)) {
        return alias;
      }
    }
  }
  if (!result) {
    defaultPatternAliases.logerror;
  }
  return;
}

function getCommandFunction(commandName) {
  return defaultCommands.find(function(item) {
    return typeof(item[commandName]) !== 'undefined';
  })[commandName];
}

function processItem(layoutItem) {
  const foundCommand = getCommand(layoutItem);
  const foundAlias = (typeof(foundCommand) === 'undefined' ? getAlias(layoutItem) : undefined);
  const command = getCommandFunction(foundCommand || foundAlias);
  this.value = layoutItem;
  const processedResult = runFunction(command, this);
  console.log("Process item:", layoutItem, (processedResult ? "was successful" : "has failed"), "for", typeof(foundAlias) === 'undefined' ? "command: " + foundCommand : "found alias: " + foundAlias);
  return processedResult;
}

try {
  globals.asyncForeach = async function(fn, argsOfArgs = [[]], scope = this) {
    const promises = [];
    for (let args of argsOfArgs) {
      if (!array.IsArray(args)) {
        args = [args];
      }
      promises.push(async function() { fn.apply(scope, args); }());
    }
    return await Promise.all(promises);
  }
} catch(ex) {}

// Similar to startProcessingFolderLayout. But if anything fails in a group, break out early.
function processFolderLayout(layoutItem) {
  if (typeof(layoutItem) === 'string') {
    return processItem(layoutItem);
  } else if (Array.isArray(layoutItem)) {
    for (let item of layoutItem) {
      if (!processItem(item)) {
        return false;
      }
    }
    return true;
  } else if (typeof(layoutItem) === 'object') {
    for (let commandKey in layoutItem) {
      if (commandKey === "folderLayout" || commandKey === "folderStructure" || commandKey === "layout" || commandKey === "all") {
        processFolderLayout(layoutItem[commandKey]);
      } else if (commandKey === "parallel") {
        try {
          globals.asyncForeach(processItem, layoutItem[commandKey]);
        } catch(ex) {
          processFolderLayout(layoutItem[commandKey]);
        }
      } else if (commandKey === "group" || commandKey === "chain") {
        return processFolderLayout(layoutItem[commandKey]);
      } else if (!processFolderLayout(commandKey + " " + layoutItem[commandKey])) {
        return false;
      }
    }
    return true;
  }
  console.error("Not sure how to execute ", layoutItem, ", as it is not a string, array, or object.");
  return false;
}

// For the first layer, don't fail out. Continue processing.
function startProcessingFolderLayout(layoutItem) {
  let result = false;
  if (typeof(layoutItem) === 'string') {
    result = processFolderLayout(layoutItem);
  } else if (Array.isArray(layoutItem)) {
    for (let item of layoutItem) {
      result = processFolderLayout(item) || result;
    }
  } else if (typeof(layoutItem) === 'object') {
    for (let commandKey in layoutItem) {
      if (commandKey === "folderLayout" || commandKey === "folderStructure" || commandKey === "layout" || commandKey === "all") {
        result = processFolderLayout(layoutItem[commandKey]) || result;
      } else if (commandKey === "parallel") {
        try {
          globals.asyncForeach(processFolderLayout, layoutItem[commandKey]);
        } catch(ex) {
          processFolderLayout(layoutItem[commandKey]);
        }
        result = true;
      } else {
        result = processFolderLayout(commandKey + " " + layoutItem[commandKey]) || result;
      }
    }
  }
  return result;
}

const packagejson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json")));
const folderLayout = packagejson.folderLayout || packagejson.folderStructure || packagejson.layout;

startProcessingFolderLayout(folderLayout);
