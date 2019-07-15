#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const child = require("child_process");
const jsonSchemaValidator = require('jsonschema').validate;

let package = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json")));

if (!("structure" in package)) {
    return;
}

// structure deprecated in favor of folders
const folderStructure = package.folders || package.structure;

function max(left, right) {
    return ((left < right) ? right : left);
}

// Updated to work with either poxis or windows relative paths for either OS. No more fiddling with Win32 or Posix!
class CrossPlatformPath {
    isTypePath(pathItem, posixOrWinThirtyTwo) {
        if (pathItem === "." || pathItem === "..") {
          return true;
        }
        if (posixOrWinThirtyTwo === "win32") {
          // Windows path cannot have a posix delimiter. But Posix can have a windows delimiter.
          return pathItem.indexOf('/') === -1; 
        }
        return pathItem.indexOf('/') >= 0;
    }
    isPosixPath(pathItem) {
        return this.isTypePath(pathItem, "posix");
    }
    isWinPath(pathItem) {
        return this.isTypePath(pathItem, "win32");
    }
    getNormalizedPath(pathItem) {
        if (pathItem === "" || pathItem === ".") {
            return "./";
        }
        if (pathItem === "..") {
            return "../";
        }
        const delimiter = (this.isPosixPath(pathItem) ? '/' : "\\");
        if (pathItem.endsWith(delimiter + "..")) {
            return pathItem + delimiter;
        }
        return pathItem;
    }
    getFilename(pathItem) {
        if (pathItem === "" || pathItem === ".") {
            return "";
        }
        if (pathItem === "..") {
            return "";
        }
        const isPosix = this.isPosixPath(pathItem);
        const delimiter = (isPosix ? '/' : "\\");
        if (pathItem.endsWith(delimiter + "..")) {
            return "";
        }
        return (isPosix ? path.posix.basename(pathItem) : path.win32.basename(pathItem));
    }
    getDirectory(pathItem) {
        if (pathItem === "" || pathItem === ".") {
            return "./";
        }
        if (pathItem === "..") {
            return "../";
        }
        const isPosix = this.isPosixPath(pathItem);
        const delimiter = (isPosix ? '/' : "\\");
        if (pathItem.endsWith(delimiter + "..")) {
            return pathItem + delimiter;
        }
        const filename = this.getFilename(pathItem);
        if (filename === "") {
            return pathItem;
        }
        return pathItem.substring(0, pathItem.length - filename.length);
    }
    countPathSize(pathItem) {
        if (pathItem === "") {
            return 0;
        }
        pathItem = this.getNormalizedPath(pathItem);
        let pathSections = [];
        if (this.isPosixPath(pathItem)) {
            pathSections = pathItem.split('/');
        } else {
            pathSections = pathItem.split("\\");
        }
        let count = pathSections.length - 1;
        for(let section of pathSections) {
            if (section !== "" && section === "..") {
                count--;
            }
        }
        if (pathSections[0] === ".") {
            count--;
        }
        if (pathSections[pathSections.length - 1] === "") {
            count--;
        }
        return count;
    }
    toTypePath(pathItem, posixOrWinThirtyTwo) {
        pathItem = this.getNormalizedPath(pathItem);
        const nativeDelimiter = (this.isPosixPath(pathItem) ? '/' : "\\");
        const sourceType = nativeDelimiter;
        const destinationType = posixOrWinThirtyTwo;
        const sourceDelimiter = (sourceType === "win32" ? "\\" : '/');
        const destinationDelimiter = (destinationType === "win32" ? "\\" : '/');
        if (pathItem === "." + destinationDelimiter) {
            return pathItem;
        }
        if (pathItem.startsWith("." + sourceDelimiter)) {
            pathItem = pathItem.substring(1 + sourceDelimiter.length);
        }
        const absolutePathItems = path[destinationType].resolve(pathItem).split(destinationDelimiter);
        const relativePathSize = this.countPathSize(pathItem);
        let result = ".";
        for(let index = max(absolutePathItems.length - relativePathSize - 1, 0); index < absolutePathItems.length; index++) {
            result = result + destinationDelimiter + absolutePathItems[index];
        }
        if (pathItem.endsWith(nativeDelimiter) && !result.endsWith(destinationDelimiter)) {
            result = result + destinationDelimiter;
        }
        return result;
    }
    toPosixPath(pathItem) {
        return this.toTypePath(pathItem, "posix");
    }
    toWinPath(pathItem) {
        return this.toTypePath(pathItem, "win32");
    }
    toNativePath(pathItem) {
        const nativePathType = (path.delimiter === '/' ? "posix" : "win32");
        return this.toTypePath(pathItem, nativePathType);
    }
    isDirectory(pathItem) {
        pathItem = this.toPosixPath(pathItem);
        if (pathItem === "." || pathItem.endsWith("..")) {
            pathItem = pathItem + "/";
        }
        return pathItem.endsWith("/");
    }
    isFile(pathItem) {
        return !isDirectory(pathItem);
    }
    createDirectory(pathItem) {
        pathItem = this.toPosixPath(pathItem);

        let directoryCreatedCount = 0;
        const pathSections = pathItem.split('/');
        let currentPath = "";
        for(let pathSection of pathSections) {
            currentPath = path.posix.join(currentPath, pathSection);
            if ((currentPath !== "." + '/') && !fs.existsSync(currentPath)) {
                fs.mkdirSync(currentPath);
                directoryCreatedCount++;
            }
        }

        return directoryCreatedCount;
    }
    createFile(itemPath) {
        this.createDirectory(itemPath);
    
        if (fs.existsSync(itemPath)) {
            return false;
        }
    
        fs.closeSync(fs.openSync(itemPath, 'w'));
        return true;
    }
    executedFromDirectory() {
        return process.cwd();
    }
    binDirectory() {
        return __dirname;
    }
    combine(pathItem, item) {
        return path.join(pathItem, item);
    }
}

class BuildFileStructure {
    constructor() {
        this.crossPlatformPath = new CrossPlatformPath();
        const shortHandPathSchema = {
            "description": "path starts with a period -> a relative path (I know...doesn't work for absolute paths. Use the descriptive version of you need that. This is shorthand!).",
            "type": "string",
            "pattern": "^(\.)"
        };
        const shortHandScriptSchema = {
            "description": "path does not start with a period and it ends with a .js extension. And a manual check to see if it is a valid path.",
            "type": "string",
            "pattern": "^(?!\.).(.*?)(\.js)$"
        };
        const shortHandCommandSchema = {
            "description": "path does not start with a period.",
            "type": "string",
            "pattern": "^(?!\.).$"
        };
        const shortHandChainSchema = {
            "definitions": {
                "shortHandPath": shortHandPathSchema,
                "shortHandScript": shortHandScriptSchema,
                "shortHandCommand": shortHandCommandSchema
            },
            "description": "an array of items that gets processed in sequential order",
            "type": "array",
            "items": {
                "anyOf": [
                    {"$ref": "#/definitions/shortHandPath"},
                    {"$ref": "#/definitions/shortHandScript"},
                    {"$ref": "#/definitions/shortHandCommand"},
                    {"$ref": "#"}
                ]
            }
        }
        const descriptiveSchema = {
            "definitions": {
                "shortHandPath": shortHandPathSchema,
                "shortHandScript": shortHandScriptSchema,
                "shortHandCommand": shortHandCommandSchema,
                "shortHandChain": {
                    "description": "an array of items that gets processed in sequential order",
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"$ref": "#/definitions/shortHandPath"},
                            {"$ref": "#/definitions/shortHandScript"},
                            {"$ref": "#/definitions/shortHandCommand"},
                            {"$ref": "#/definitions/shortHandChain"}
                        ]
                    }
                }
            },
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["path", "script", "command"],
                    "default": "path"
                },
                "path": {
                    "description": "Posix or win32 path to a directory or file. File folder delimiter at the end denotes a path being a directory. If it specifies a file, it will be created blank. You may use chain + javascript to populate it.",
                    "type": "string"
                },
                "description": {"type": "string"},
                "chainOnSuccess": {
                    "description": "On the parents success, each item in the array will be ran. Success/Failure of each item will be ignored unless a chain is specified on that item.",
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"$ref": "#/definitions/shortHandPath"},
                            {"$ref": "#/definitions/shortHandScript"},
                            {"$ref": "#/definitions/shortHandCommand"},
                            {"$ref": "#"}
                        ]
                    }
                },
                "chainOnFailure": {
                    "description": "On the parents failure, each item in the array will be ran. Success/Failure of each item will be ignored unless a chain is specified on that item.",
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"$ref": "#/definitions/shortHandPath"},
                            {"$ref": "#/definitions/shortHandScript"},
                            {"$ref": "#/definitions/shortHandCommand"},
                            {"$ref": "#"}
                        ]
                    }
                },
                "chainAlways": {
                    "description": "Regardless of the parents success/failure, each item in the array will be ran. Success/Failure of each item will be ignored unless a chain is specified on that item.",
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"$ref": "#/definitions/shortHandPath"},
                            {"$ref": "#/definitions/shortHandScript"},
                            {"$ref": "#/definitions/shortHandCommand"},
                            {"$ref": "#"}
                        ]
                    }
                }
            },
            "required": ["action", "path"]
        };

        this.buildSchema = {
            shortHandPathSchema,
            shortHandScriptSchema,
            shortHandCommandSchema,
            shortHandChainSchema,
            descriptiveSchema
        };

        this.paths = [this.crossPlatformPath.executedFromDirectory(),
                      this.crossPlatformPath.binDirectory()];
        this.pluginPath = [
            this.crossPlatformPath.combine(this.crossPlatformPath.executedFromDirectory(), "plugins/"),
            this.crossPlatformPath.combine(this.crossPlatformPath.binDirectory(), "../plugins/")
        ];
        for(let path of this.paths) {
            this.pluginPath.push(this.crossPlatformPath.combine(path, "plugins"));
        }
    }

    getItemType(item) {
        for(let name in this.buildSchema) {
            try {
                if (jsonSchemaValidator(item, this.buildSchema[name]).valid) {
                    return name;
                }
            } catch(ex) {
                console.log("jsonSchemaValidator could not process " + (item || "").toString() + ". Error: " + ex);
            }
        }
        console.log("jsonSchemaValidator could find an item for: " + (item || "").toString() + ".");
        return "";
    }

    runItem(itemCommand) {
        try {
            child.exec(itemCommand);
        } catch(exception) {
        }
    
        return true; // TODO: Return error if error came through or specific text is returned?
    }

    processShortHandPathSchema(structureItem) {
        const posixPath = this.crossPlatformPath.toPosixPath(structureItem);

        if (this.crossPlatformPath.isDirectory(structureItem)) {
            return this.crossPlatformPath.createDirectory(structureItem);
        }
        return this.crossPlatformPath.createFile(structureItem);
    }

    processShortHandScriptSchema(structureItem) {
        if (!fs.existsSync(structureItem)) {
            return false;
        }
        return this.runItem("node " + structureItem);
    }

    processShortHandCommandSchema(structureItem) {
        return this.runItem(structureItem);
    }

    processShortHandChainSchema(structureItem) {
        return this.processChain(structureItem);
    }

    processDescriptiveSchema(structureItem) {
        let success = false;
        let result = false;
        switch(structureItem.action) {
            case "path":
                success = this.processShortHandPathSchema(structureItem.path);
                break;
            case "script":
                success = this.processShortHandScriptSchema(structureItem.path);
                break;
            case "command":
                success = this.processShortHandCommandSchema(structureItem.path);
                break;
        }
        if (success && typeof(structureItem.chainOnSuccess) !== 'undefined') {
            this.processChainAll(structureItem.chainOnSuccess);
            result = true;
        }
        if (!success && typeof(structureItem.chainOnFailure) !== 'undefined') {
            this.processChainAll(structureItem.chainOnFailure);
            result = true;
        }
        if (typeof(structureItem.chainAlways) !== 'undefined') {
            this.processChainAll(structureItem.chainAlways);
            result = true;
        }

        return success || result;
    }

    processStructureItem(structureItem) {
        const itemType = this.getItemType(structureItem);
        switch(itemType) {
            case "shortHandPathSchema":
                return this.processShortHandPathSchema(structureItem);
            case "shortHandScriptSchema":
                // If this fails to run, it will try shortHandCommandSchema
                if (this.processShortHandScriptSchema(structureItem)) {
                    return true;
                }
            case "shortHandCommandSchema":
                return this.processShortHandCommandSchema(structureItem);
            case "shortHandChainSchema":
                return this.processShortHandChainSchema(structureItem);
            case "descriptiveSchema":
                return this.processDescriptiveSchema(structureItem);
        }

        // The old way of processing things... Keeping it intact in case validating schema doesn't work.
        if (Object.keys(structureItem).indexOf("chain") !== -1) {
            return this.processChain(structureItem.chain);
        }
        if (Array.isArray(structureItem)) {
            return this.processChain(structureItem);
        }
    
        const posixPath = this.crossPlatformPath.toPosixPath(structureItem);
        const isPath = posixPath.startsWith(".") || posixPath.startsWith("/");
    
        if (isPath) {
            if (this.crossPlatformPath.isDirectory(structureItem)) {
                return this.crossPlatformPath.createDirectory(structureItem);
            } else {
                return this.crossPlatformPath.createFile(structureItem);
            }
        }
    
        return this.runItem(structureItem);
    }
    
    processChain(chainItems) {
        let chainRunSuccess = true;
    
        for (let chainIndex = 0; chainIndex < chainItems.length; chainIndex++) {
            const chainItem = chainItems[chainIndex];
            chainRunSuccess = this.processStructureItem(chainItem);
    
            if (!chainRunSuccess) {
                break;
            }
        }
    
        return chainRunSuccess;
    }

    processChainAll(chainItems) {
        let chainRunSuccess = true;
    
        for (let chainIndex = 0; chainIndex < chainItems.length; chainIndex++) {
            const chainItem = chainItems[chainIndex];
            chainRunSuccess = this.processStructureItem(chainItem) && chainRunSuccess;
        }
   
        return chainRunSuccess;
    }

    processStructure(folderStructure) {
        let runSuccess = true;
    
        for (let index = 0; index < folderStructure.length; ++index) {
            const structureItem = folderStructure[index];
    
            if (!this.processStructureItem(structureItem)) {
                runSuccess = false;
            }       
        }
    
        return runSuccess;
    }
}

const buildFileStructure = new BuildFileStructure();
buildFileStructure.processStructure(folderStructure);
