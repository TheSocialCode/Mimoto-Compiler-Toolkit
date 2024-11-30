/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import core classes
const fs = require('fs');
const path = require('path');


class DistributeMimoto
{

	// data
	_config = null;



	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Constructor
	 * @param config
	 */
	constructor(config)
	{
		// 1. store
		this._config = config;
	}



	// ----------------------------------------------------------------------------
	// --- Public methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Distribute
	 */
	distribute(sTargetDir)
	{
		return new Promise((resolve, reject) =>
		{
			// 1. verify or skip
			if (!this._config.mimoto || !this._config.mimoto.target) { resolve(); return; }

			// 2. helper
			let classRoot = this;

			// 3. compose path of source file
			const sFilePath = path.join(__dirname, '/../../bin/thesocialcode/mimoto/Mimoto.min.js');

			// 4. read the file content
			fs.readFile(sFilePath, 'utf8', function(err, data)
			{
				// a. validate or exit
				if (err) { console.error(err); process.exit(1); }

				// b. compose path of target file
				let sTargetFilePath = path.join(sTargetDir, classRoot._config.mimoto.target, 'Mimoto.js')

				// c. extract the directory path from the file path
				const sDirPath = path.dirname(sTargetFilePath);

				// d. create the directory if it doesn't exist
				if (!fs.existsSync(sDirPath)) fs.mkdirSync(sDirPath, { recursive: true });

				// e. write Mimoto.js to target
				fs.writeFile(sTargetFilePath, data, 'utf8', function(err)
				{
					// I. validate or exit
					if (err) { console.error(err); process.exit(1); }

					// II. report
					console.log('\n');
					console.log(`┌───`);
					console.log(`│`);
					console.log(`│   🌱 - \x1b[1mMimoto\x1b[0m 💬 - Mimoto.min.js has been added to the project!`);
					console.log(`│`);
					console.log(`└───`);

					// III. report
					resolve();
				});
			});
		});
	}
}

module.exports = DistributeMimoto;