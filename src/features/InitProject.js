/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import core classes
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

// import Mimoto util classes
const DataUtils = require("../../toolkit/utils/DataUtils");


class InitProject
{

	// data
	_config = null;



	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Constructor
	 * @param sFileToWatch
	 * @param sDestinationFile
	 */
	constructor(sFileToWatch, sDestinationFile)
	{
		// 1. validate file to watch or exit
		if (!fs.existsSync(sFileToWatch))
		{
			console.log('\n');
			console.log('🚨 - WARNING - Clone function unable to find file \u001b[1m\u001B[31m' + sFileToWatch + '\u001B[0m\u001b[22m to watch');
			process.exit(1);
		}

		// 2. validate destination path or exit
		if (!sDestinationFile)
		{
			console.log('\n');
			console.log('🚨 - WARNING - Clone function needs a destination path and file name');
			process.exit(1);
		}

		// 3. watch for changes in the file
		fs.watch(sFileToWatch, (sEventType, sFileName) =>
		{
			// a. validate or exit
			if (!(sFileName && sEventType === 'change')) return;

			// b. clone
			this._cloneFile(sFileToWatch, sDestinationFile);
		});

		// 4. report
		console.log(`Watching for file changes on ${sFileToWatch}\n`);

		// 5. initial clone
		this._cloneFile(sFileToWatch, sDestinationFile);
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------




}

module.exports = InitProject;