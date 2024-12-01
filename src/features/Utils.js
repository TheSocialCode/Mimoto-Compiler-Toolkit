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

			console.log('Utils._sProjectRoot = ', Utils._sProjectRoot);
			console.log('Utils.sMimotoRoot = ', Utils.getMimotoRoot());

			// b. check if project root is the mimoto root and set default test dir if so
			if (Utils.isMimotoPackage()) {
				Utils._sProjectRoot = path.join(Utils._sProjectRoot, Utils._MIMOTO_TEST_DIR);
			}
		}

		// 2. send
		return process.cwd();
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

	static isMimotoPackage() {
		try {
			const packageJsonPath = path.join(Utils._sProjectRoot, 'package.json');
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			return packageJson.name === 'mimoto';
		} catch (error) {
			console.error('Error reading package.json:', error);
			return false;
		}
	}

}

module.exports = Utils;