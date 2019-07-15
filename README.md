Small utility to build out your file structure.

July 15, 2019 - Recently refactored and greatly simplified.

So when looking at package.json, you get a general idea of your project.
Including building out directories, blank files, downloading files, syncing npm modules to local directories (feature in progress implemented), and running javascript scripts (OS-agnostic) and commands.

(Note: npm is behind github. Refactoring code and stabilizing. Probably time to switch to develop. Was in a rush and forgot.)

> npm install -g folder_structure

The only command that works right now is `build-fs`. Fortunately, it is the most useful. It builds your directory out and runs each script.

Alpha example:

```
{
  "name": "folder_structure",
  "version": "0.1.0",
  "description": "Server-side module for folder structure building.",
  "main": "app.js",
  "scripts": {
    "bundle": "./node_modules/.bin/browserify index.js > bundle.js",
    "test": "./node_modules/.bin/mocha --reporter spec"
  },
  "keywords": [
    "folder",
    "folder-layout",
    "sync-directory"
  ],
  "author": "TamusJRoyce",
  "license": "SEE LICENSE IN license.txt",
  "devDependencies": {
    "chai": "^4.2.0",
    "mocha": "^5.2.0"
  },
  "folderLayout_note": "Your paths can be windows or posix based. They will be automatically detected converted to relative paths for processing.",
  "folderLayout": [
    "./README.md",
    "./server/app/",
    "./server/scripts/setup/",
    "./server/scripts/prerun/",
    "./server/scripts/postrun/",
    "./server/scripts/database/",
    "./client/site/",
    "./client/site/assets/",
    "./client/site/scripts/",
    "./client/site/styles/",
    "./src/",
    "./src/test/",
    "./src/"
  ]
}
```

Notice above:  "folderLayout" shows a desired file structure.

Here is a more advanced one. This one initializes blank files and executes scripts to build out file content (only if the file did not exist before). This comes from package.json in this repository!

```
{
  "...": "...",
  "bin": {
    "folder-structure": "./bin/cli.js",
    "build-folderstruct": "./bin/cli-build_directory_structure.js",
    "init-folderstruct": "./bin/cli-init_directory_structure.js"
  },
  "folderLayout_note": "Your paths can be windows or posix based. They will be automatically detected converted to relative paths for processing.",
  "folderLayout": [
    "./test/",
    "./test/tests.js",
    "./bin/",
    "./bin/cli.js",
    [
      "./test/mocha.opts",
      "echo server-tests >> ./test/mocha.opts",
      "echo --recursive >> ./test/mocha.opts"
    ],
    [
      "./license.txt",
      "wget https://api.github.com/licenses/mit -O license.txt",
      "curl -o license.txt https://api.github.com/licenses/mit",
      "node --eval \"const https = require('https'); fs = require('fs'); https.get('https://api.github.com/licenses/mit', {json:true}, function(error,response,body) {if (error) {return console.log(error)$
    ],
    [
      "./.gitignore",
      "echo package.lock >> ./.gitignore",
      "echo ./node_modules/ >> ./.gitignore"
    ],
    {
      "chain": [
        "./README.md",
        "node --eval \"const package = require('./package.json'); console.log(package.description);\" >> ./README.md"
      ]
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/tamusjroyce/nodejs_folder_structure.git"
  }
}
```

I find it useful to describe your desired folder structure in package.json. And at the same time, allow it to be built out. I hope you do too!

Hopefully Helpful!
-TamusJRoyce
