#!/usr/bin/evn node
const path = require('path');
const child = require("child_process");

if (typeof(__dirname) === 'undefined') {
    try {
        const url = require('url');
        const fileURLToPath = url.fileURLToPath;
        this.__dirname = path.dirname(fileURLToPath("./"));
    } catch(ex) {
    }
}

const buildFolderLayoutPath = path.normalize(path.join(__dirname, "../build-folder-layout.js"));
if (process.argv.indexOf("dir") != -1 || process.argv.indexOf("build") != -1) {
    console.log(child.execSync("node " + buildFolderLayoutPath + " \"" + process.argv.join("\"") + "\"").toString());
    return;
}
console.log(child.execSync("node " + buildFolderLayoutPath).toString());
