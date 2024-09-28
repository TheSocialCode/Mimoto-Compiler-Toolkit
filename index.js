/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import core node classes
const fs = require('fs');
const path = require('path');

// 2. import Mimoto CLI classes
const Startup = require('./src/Startup');



// ----------------------------------------------------------------------------
// --- Startup ----------------------------------------------------------------
// ----------------------------------------------------------------------------



// 3. read command (second argument)
let sCommand = process.argv[2];

// 4. register  full list of arguments
const aArgs = process.argv.slice(3);

// 5. start
const startup = new Startup(sCommand, aArgs);
