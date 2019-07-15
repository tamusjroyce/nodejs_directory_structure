#!/usr/bin/evn node
const path = require('path');
const child = require("child_process");

let __dirname = __dirname;
if (typeof(__dirname) === 'undefined') {
    try {
        import { fileURLToPath } from 'url';
        __dirname = path.dirname(fileURLToPath(import.meta.url));
    } catch(ex) {
    }
}

const buildFolderLayoutPath = path.normalize(path.join(__dirname, "../build_folder_layout.js"));
if (process.argv.indexOf("dir") != -1 || process.argv.indexOf("build") != -1) {
    child.exec("node " + buildFolderLayoutPath + " \"" + process.argv.join("\"") + "\"");
    return;
}

child.exec("node " + buildFolderLayoutPath);