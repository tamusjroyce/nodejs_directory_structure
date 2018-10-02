Small utility to build out your file structure.

So when looking at package.json, you get a general idea of your project.
Including how directories, blank files, downloads, and scripts are to be used.

> npm install -g folder_structure

The only command that works right now is `build-folderstruct`. Fortunately, it is the most useful. It builds your directory out and runs each script.

Alpha example:

```
{
  "name": "voice_recognition",
  "version": "0.1.0",
  "description": "Polyfil/wrapper client-side module for voice recognition. Supporting annyang! browser specific voice recognition (google voice online, possibly nuance offline, and maybe others a user m$
  "main": "app.js",
  "scripts": {
    "bundle": "./node_modules/.bin/browserify index.js > bundle.js",
    "test": "./node_modules/.bin/mocha --reporter spec"
  },
  "keywords": [
    "voice",
    "recognition",
    "input",
    "device"
  ],
  "author": "TamusJRoyce",
  "license": "SEE LICENSE IN license.txt",
  "devDependencies": {
    "browserify": "^16.2.3",
    "chai": "^4.2.0",
    "mocha": "^5.2.0"
  },
  "structure": [
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

Notice above:  "structure" shows a desired file structure.

Here is a more advanced one. This one initializes blank files and executes scripts to build out file content (only if the file did not exist before). This comes from package.json in this repository!

```
{
  "...": "...",
  "bin": {
    "folder-structure": "./bin/cli.js",
    "build-folderstruct": "./bin/cli-build_directory_structure.js",
    "init-folderstruct": "./bin/cli-init_directory_structure.js"
  },
  "structure": [
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

I am not sure if this is best practice. But each to their own. I desire something easily understandable and all in one place.

This tool is not meant convert package.json into a Makefile-like format. Please use pre-build and post-build hooks if you need that functionality.

This is only meant to document your folder structure. And at the same time, allow it to be built out.

Hopefully Helpful!
-TamusJRoyce
