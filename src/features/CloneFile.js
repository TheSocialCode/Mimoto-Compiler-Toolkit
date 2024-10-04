/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import core classes
const fs = require('fs');
const path = require('path');

// import Mimoto util classes
const DataUtils = require("../../toolkit/utils/DataUtils");

let execa;

// At the top of your file, import execa dynamically
(async () => {
  execa = (await import('execa')).default;
})();


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


	/**
	 * Clone file
	 * @param sFileToWatch
	 * @param sDestinationFile
	 * @private
	 */
	_cloneFile(sFileToWatch, sDestinationFile)
	{
		// 1. create the directory if it doesn't exist
		if (!fs.existsSync(path.dirname(sDestinationFile))) fs.mkdirSync(path.dirname(sDestinationFile), { recursive: true });

		// 2. copy the file to the destination
		execa.copy(sFileToWatch, sDestinationFile);

		// 3. register
		let end = new Date();

		// 4. compose
		const sTimestampDone = end.getFullYear() + '.' + DataUtils.addLeadingZeros(end.getMonth() + 1, 2) + '.' + DataUtils.addLeadingZeros(end.getDate(), 2) + ' ' + DataUtils.addLeadingZeros(end.getHours(), 2) + ':' + DataUtils.addLeadingZeros(end.getMinutes(), 2) + ':' + DataUtils.addLeadingZeros(end.getSeconds(), 2);

		// 5. output result
		console.log(`🥦 - File \u001b[1m${path.basename(sFileToWatch)}\u001b[22m copied to \u001b[1m${sDestinationFile}\u001b[22m at ${sTimestampDone}\n`);
	}

}

module.exports = CloneFile;