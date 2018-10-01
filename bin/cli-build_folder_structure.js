#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const child = require("child_process");
const package = require(path.join(process.cwd(), "package.json"));

if (!("structure" in package)) {
    return;
}

const structure = package.structure;

function IsPath(structureItem) {
    return (structureItem.startsWith(".") || structureItem.startsWith("/") ||
            structureItem.startsWith("\\") || structureItem.substring(1).startsWith(":\\"));
}

function IsDirectory(structureItem) {
    return (structureItem.endsWith("/") || structureItem.endsWith("\\"));
}

function MinFound(left, right) {
    if (right == -1 || left < right) {
        return left;
    }

    return right;
}

function GetPathNextIndex(directoryPath, index) {
    return MinFound(directoryPath.indexOf("/", index), directoryPath.indexOf("\\", index));
}

function CreateDirectory(directoryPath) {
    let previousIndex = 0;
    let index = GetPathNextIndex(directoryPath, 0);

    let isLastDirectoryCreated = false;
    let pathItems = [];
    while (index != -1) {
        const directoryName = directoryPath.substring(previousIndex + 1, index);
        isLastDirectoryCreated = false;

        pathItems.push(directoryName);
        const currentPath = path.normalize(path.join(...pathItems));

        if (!fs.existsSync(currentPath)) {
            isLastDirectoryCreated = true;
            fs.mkdirSync(currentPath);
        }

        previousIndex = index;
        index = GetPathNextIndex(directoryPath, index + 1);
    }

    return isLastDirectoryCreated;
}

function CreateFile(itemPath) {
    CreateDirectory(itemPath);

    if (fs.existsSync(itemPath)) {
        return false;
    }

    fs.closeSync(fs.openSync(itemPath, 'w'));
    return true;
}

function RunItem(itemCommand) {
    try {
        child.exec(itemCommand);
    } catch(exception) {
    }

    return true; // TODO: Return error if error came through or specific text is returned?
}

function ProcessStructureItem(structureItem) {
    if (Object.keys(structureItem).indexOf("chain") != -1) {
        return ProcessChain(structureItem.chain);
    }
    if (Array.isArray(structureItem)) {
        return ProcessChain(structureItem);
    }

    const isPath = IsPath(structureItem);

    if (isPath) {
        if (IsDirectory(structureItem)) {
            return CreateDirectory(structureItem);
        } else {
            return CreateFile(structureItem);
        }
    }

    return RunItem(structureItem);
}

function ProcessChain(chainItems) {
    let chainRunSuccess = true;

    for (let chainIndex = 0; chainIndex < chainItems.length; chainIndex++) {
        const chainItem = chainItems[chainIndex];
        chainRunSuccess = ProcessStructureItem(chainItem);

        if (!chainRunSuccess) {
            break;
        }
    }

    return chainRunSuccess;
}

function ProcessStructure(structure) {
    let runSuccess = true;

    for (let index = 0; index < structure.length; ++index) {
        const structureItem = structure[index];

        if (!ProcessStructureItem(structureItem)) {
            runSuccess = false;
        }       
    }

    return runSuccess;
}

ProcessStructure(structure);
