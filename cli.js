#!/usr/bin/env node
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');


const config = require('mimoto.config.json');

console.log('config =', config);


// Configuration
const config = {
    watchFolders: ['./folder1', './folder2'], // These are the folders you want to watch
    outputFile: 'combined.html' // The file where all HTML will be concatenated
};

// Function to concatenate HTML files
function concatenateHtmlFiles(folderPaths) {
    let combinedHtml = '';

    folderPaths.forEach(folder => {
        fs.readdirSync(folder).forEach(file => {
            if (path.extname(file) === '.html') {
                const filePath = path.join(folder, file);
                combinedHtml += fs.readFileSync(filePath, 'utf8');
            }
        });
    });

    fs.writeFileSync(config.outputFile, combinedHtml);
    console.log(`Updated ${config.outputFile}`);
}

// Initial concatenation
concatenateHtmlFiles(config.watchFolders);

// Watching for file changes
chokidar.watch(config.watchFolders, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
}).on('all', (event, path) => {
    console.log(`File ${path} has been ${event}`);
    concatenateHtmlFiles(config.watchFolders);
});
