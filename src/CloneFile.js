/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import core classes
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

// import Mimoto util classes
const DataUtils = require("../toolkit/utils/DataUtils");


class CloneFile
{

	// data
	_config = null;



	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Constructor
	 * @param sFileToWatch
	 * @param sDestinationPath
	 */
	constructor(sFileToWatch, sDestinationPath)
	{
		// 1. validate file to watch or exit
		if (!fs.existsSync(sFileToWatch))
		{
			console.log('\n');
			console.log('🚨 - WARNING - Clone function unable to find file \u001b[1m\u001B[31m' + sFileToWatch + '\u001B[0m\u001b[22m to watch');
			process.exit(1);
		}

		// 2. validate destination path or exit
		if (!sDestinationPath)
		{
			console.log('\n');
			console.log('🚨 - WARNING - Clone function needs a destination path');
			process.exit(1);
		}

		// 3. watch for changes in the file
		fs.watch(sFileToWatch, (sEventType, sFileName) =>
		{
			// a. validate or exit
			if (!(sFileName && sEventType === 'change')) return;

			// b. compose destination file path
			const sDestinationFile = path.join(sDestinationPath, sFileName);

			// c. create the directory if it doesn't exist
			if (!fs.existsSync(sDestinationPath)) fs.mkdirSync(sDestinationPath, { recursive: true });

			// d. copy the file to the destination
			shell.cp(sFileToWatch, sDestinationFile);

			// e. register
			let end = new Date();

			// f. compose
			const sTimestampDone = end.getFullYear() + '.' + DataUtils.addLeadingZeros(end.getMonth() + 1, 2) + '.' + DataUtils.addLeadingZeros(end.getDate(), 2) + ' ' + DataUtils.addLeadingZeros(end.getHours(), 2) + ':' + DataUtils.addLeadingZeros(end.getMinutes(), 2) + ':' + DataUtils.addLeadingZeros(end.getSeconds(), 2);

			// g. output result
			console.log(`🥦 - File \u001b[1m${sFileName}\u001b[22m copied to \u001b[1m${sDestinationFile}\u001b[22m at ${sTimestampDone}\n`);
		});

		// 4. report
		console.log(`Watching for file changes on ${sFileToWatch}\n`);
	}

}

module.exports = CloneFile;