/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import core node classes
const path = require('path');
const fs = require('fs');


class Utils
{

	// private static variables
	static _inquirer = null;
	static _sProjectRoot = null;
	static _sMimotoRoot = null;
	static _config = null;
	static _bIsMimotoPackage = false;
	static _bHasExistingConfig = false;

	// private static variables
	static _MIMOTO_TEST_DIR = 'cache';



	// ----------------------------------------------------------------------------
	// --- Public methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Get the Inquirer module
	 * @returns {Promise<import('inquirer')>}
	 */
	static async getInquirer()
	{
		// 1. check if already loaded
		if (!Utils._inquirer)
		{
			// a. import
			const inquirerModule = await import('inquirer');

			// b. store
			Utils._inquirer = inquirerModule.default;
		}

		// 2. send
		return Utils._inquirer;
	}

	/**
	 * Handle an error
	 * @param {Error} error
	 * @param {string} sMessageUnknowError
	 */
	static handleError(error, sMessageUnknowError = 'An unknown error occurred')
	{
		// 1. check if user requested exit
		if (error.name === 'ExitPromptError')
		{
			// a. report
			Utils.report('Halt request granted!');

			// b. exit
			process.exit(0);
		}
		else
		{
			// a. report
			console.error(sMessageUnknowError, error);
		}
	}

	/**
	 *
	 * @param sMessage
	 * @param bIsError
	 * @param error
	 */
	static report(sMessage, bIsError = false, error = null)
	{
		console.log('\n');
		console.log(`┌───`);
		console.log(`│`);
		console.log(`│  ` + ((bIsError) ? '⚠️' : '🌱') + ` - \x1b[1mMimoto\x1b[0m 💬 - ` + sMessage);
		if (error)
		{
			console.log(`│`);
			console.log(`│  `, error);
		}
		console.log(`│`);
		console.log(`└───`);
	}

	/**
	 * Get the project root
	 * @returns {string}
	 */
	static getProjectRoot()
	{
		// 1. check if already loaded
		if (!Utils._sProjectRoot)
		{
			// a. get
			Utils._sProjectRoot = process.cwd();

			try
			{
				// I. prepare
				const packageJsonPath = path.join(Utils._sProjectRoot, 'package.json');

				// II. read
				const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

				// III. determine
				Utils._bIsMimotoPackage = (packageJson.name === 'mimoto');
			}
			catch (error)
			{
				// no package.json or error reading it
			}
			
			// c. check if project root is the mimoto root and set default test dir if so
			if (Utils._bIsMimotoPackage) Utils._sProjectRoot = path.join(Utils._sProjectRoot, Utils._MIMOTO_TEST_DIR);
		}

		// 2. send
		return Utils._sProjectRoot;
	}

	/**
	 * Get the Mimoto root
	 * @returns {string}
	 */
	static getMimotoRoot()
	{
		// 1. check if already loaded
		if (!Utils._sMimotoRoot)
		{
			try {
				// a. find
				const mimotoPackagePath = require.resolve('mimoto/package.json');

				// b. store
				Utils._sMimotoRoot = path.dirname(mimotoPackagePath);
			}
			catch (error)
			{
				// a. store (if require.resolve fails, it means the script is likely running inside the package itself)
				Utils._sMimotoRoot = process.cwd();
			}
		}

		// 2. send
		return Utils._sMimotoRoot;
	}

	static isMimotoPackage()
	{
		// 1. get project root
		Utils.getProjectRoot();

		// 2. send
		return Utils._bIsMimotoPackage;
	}

	/**
	 * Get the Mimoto config
	 * @returns {Promise<null>}
	 */
	static async getConfig()
	{
		// 1. check if already loaded
		if (!Utils._config)
		{
			// a. load configuration file mimoto.config.json
			Utils._config = (() =>
			{
				// I. prepare
				const sConfigFilePath = path.join(Utils.getProjectRoot(), 'mimoto.config.json');

				// II. load
				try
				{
					// 1. toggle
					Utils._bHasExistingConfig = true;

					// 2. load and send
					return JSON.parse(fs.readFileSync(sConfigFilePath, 'utf8'));
				}
				catch(error)
				{
					// 1. Attempt to copy the config file from the boilerplate
					try
					{
						// a. prepare
						const sBoilerplateConfigPath = path.join(Utils.getMimotoRoot(), 'boilerplates', 'project', 'mimoto.config.json');

						// b. validate
						if (fs.existsSync(sBoilerplateConfigPath))
						{
							// I. store
							return JSON.parse(fs.readFileSync(sBoilerplateConfigPath, 'utf8'));
						}
						else
						{
							// I. report
							Utils.report('Boilerplate config file not found.', true);

							// II. exit
							process.exit(1);
						}
					}
					catch (copyError)
					{
						// a. report
						Utils.report('Error copying config file from boilerplate.', true, copyError);

						// b. exit
						process.exit(1);
					}
				}
			})();
		}

		// 2. send
		return Utils._config;
	}

	/**
	 * Reset the Mimoto config
	 * @returns {Promise<null>}
	 */
	static async resetConfig()
	{
		// 1. check if already loaded
		Utils._config = null;
	}

	/**
	 * Check if a config file exists
	 * @returns {boolean}
	 */
	static async hasExistingConfig()
	{
		// 1. get config
		await Utils.getConfig();

		// 2. send
		return Utils._bHasExistingConfig;
	}
}

module.exports = Utils;