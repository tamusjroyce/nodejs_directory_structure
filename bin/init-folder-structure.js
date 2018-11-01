#!/usr/bin/evn node

const fs = require("fs");
const path = require("path");
const child = require("child_process");

const jsonPackageFilePath = path.join(process.cwd(), "package.json");
const package = require(jsonPackageFilePath);

if ("structure" in package) {
    console.log("");
    console.log("structure already exists in your package.json. Please remove it before re-initializing.");
    console.log("Node does not support sync asking questions like sync reading files. Tool size not worth Promise Boilerplate el");
    console.log("");
    return;
}

package.structure  =
  [
    "./test/tests.js",
    [
      "./.gitignore",
      "echo node_modules >> ./.gitignore",
      "echo build >> ./.gitignore",
      "echo npm-debug.log >> ./.gitignore",
      "echo .env >> ./.gitignore",
      "echo .DS_Store >> ./.gitignore"
    ],
    [
      "./README.md",
      "node --eval \"const package = require('./package.json'); console.log(package.description);\" >> ./README.md"
    ]
  ];

fs.writeFileSync(jsonPackageFilePath, JSON.stringify(package));


