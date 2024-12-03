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

	// private static variables
	static _MIMOTO_TEST_DIR = 'cache';



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
			console.log('\n');
			console.log(`┌───`);
			console.log(`│`);
			console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - Halt request granted!`);
			console.log(`│`);
			console.log(`└───`);

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

			let bDefaultConfig = false;


			const configFile = path.join(Utils.getProjectRoot(), 'mimoto.config.json');


			// 4. load configuration file mimoto.config.json
			const config = (() =>
			{
				// b. load
				try
				{
					// IV. load and send
					return JSON.parse(fs.readFileSync(configFile, 'utf8'));

				} catch(error) {

					// I. report error
					// console.log('🚨 - WARNING - Missing config file \u001b[1m\u001B[31mmimoto.config.json\u001B[0m\u001b[22m in project root');

					// II. Attempt to copy the config file from the boilerplate
					try {
						const boilerplateDir = path.join(__dirname, '..', 'boilerplates', 'project');
						const sourceConfigPath = path.join(boilerplateDir, 'mimoto.config.json');
						const targetConfigPath = path.join(Utils.getProjectRoot(), 'mimoto.config.json');

						if (fs.existsSync(sourceConfigPath)) {
							fs.copyFileSync(sourceConfigPath, targetConfigPath);
							// console.log('✅ - Copied mimoto.config.json from boilerplate to project root.');

							bDefaultConfig = true;

							return JSON.parse(fs.readFileSync(configFile, 'utf8'));

						} else {
							console.error('❌ - Boilerplate config file not found. Please ensure it exists at:', sourceConfigPath);
							process.exit(1);
						}
					} catch (copyError) {
						console.error('Error copying config file from boilerplate:', copyError);
						process.exit(1);
					}
				}
			})();
		}

		// 2. send
		return Utils._config;
	}
}

module.exports = Utils;