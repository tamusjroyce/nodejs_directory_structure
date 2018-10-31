#!/usr/bin/evn node
const child = require("child_process");

if (process.argv.indexOf("dir") != -1 || process.argv.indexOf("build") != -1) {
    child.exec("node ./init-folder-structure.js \"" + process.argv.join("\"") + "\"");
    return;
}


child.exec("node ./init-folder-structure.js");
