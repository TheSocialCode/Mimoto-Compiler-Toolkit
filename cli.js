#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { concatenateHtmlFiles } = require('./index'); // Assuming your function is exported from index.js

const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('f', {
        alias: 'folders',
        describe: 'Folders to watch',
        type: 'array',
        demandOption: true
    })
    .option('o', {
        alias: 'output',
        describe: 'Output file name',
        type: 'string',
        demandOption: true
    })
    .help('h')
    .alias('h', 'help')
    .argv;

// Using the arguments from the CLI
const watchFolders = argv.folders;
const outputFile = argv.output;

// Call your main function with CLI arguments
concatenateHtmlFiles(watchFolders, outputFile);
