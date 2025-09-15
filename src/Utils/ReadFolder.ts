import fs from "fs";
import pathModule from "path";

const files: string[] = []; // string[] of paths

export default function readFolder(inputPath: string, depth = 3) {
    // resolve relative paths into absolute
    let absolutePath = pathModule.isAbsolute(inputPath)
        ? inputPath
        : pathModule.resolve(inputPath);

    if (absolutePath.endsWith(pathModule.sep)) {
        absolutePath = absolutePath.slice(0, -1);
    }

    files.length = 0;
    walkFolder(absolutePath, depth);
    return files;
}

function walkFolder(currentPath: string, depth = 3) {
    const folderEntries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of folderEntries) {
        const fullPath = pathModule.join(currentPath, entry.name);

        if (entry.isDirectory()) {
            if (depth <= 0) {
                console.warn(`Maximum depth reached - Skipping ${fullPath}`);
                continue;
            }
            walkFolder(fullPath, depth - 1);
        } else {
            files.push(fullPath);
        }
    }
}
