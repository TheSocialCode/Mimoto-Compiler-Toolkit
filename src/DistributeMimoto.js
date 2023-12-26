/**
 * Mimoto - The Social Code
 *
 * @author Sebastian Kersten (@supertaboo)
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
	distribute()
	{
		return new Promise((resolve, reject) =>
		{
			// 1. verify or skip
			if (!this._config.mimoto || !this._config.mimoto.target) { resolve(); return; }

			// 2. compose path to Mimoto.js in bin
			const filePath = path.join(__dirname, '/../bin/thesocialcode/mimoto/Mimoto.min.js');

			// 3. helper
			let classRoot = this;

			// 4. read the file content
			fs.readFile(filePath, 'utf8', function(err, data)
			{
				// a. validate or exit
				if (err) { console.error(err); process.exit(1); }

				// b. compose path of target file
				let sTargetFilePath = path.join(classRoot._config.RUNTIME_ROOT, classRoot._config.mimoto.target, 'Mimoto.js')

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
					console.log('✨ - Mimoto.js has been added to the project!\n');

					// III. report
					resolve();
				});
			});
		});
	}
}

module.exports = DistributeMimoto;