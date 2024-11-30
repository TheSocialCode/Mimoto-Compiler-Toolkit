/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import core node classes
const fs = require('fs');
const path = require('path');

// 2. import Mimoto CLI classes
const InitProject = require('./../src/features/InitProject');
const DistributeMimoto = require('./../src/features/DistributeMimoto');
const CombineTemplates = require('./../src/features/CombineTemplates');
const CloneFile = require('./../src/features/CloneFile');
const InstallComponents = require('./features/InstallComponents');
const Utils = require('./features/Utils');
const readline = require("readline");


class Startup
{

	// data
	_config = null;



	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Constructor
	 * @param sCommand
	 * @param aArgs
	 */
	constructor(sCommand, aArgs)
	{
		// 1. Set up SIGINT handler
		this._setupSigintHandler();

		// 2. init (moved to private function to allow async)
		this._init(sCommand);
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Initialize compiler toolkit
	 * @param sCommand
	 * @returns {Promise<void>}
	 * @private
	 */
	async _init(sCommand)
	{
		if (!sCommand)
		{
			const questions = [
				{
					type: 'list',
					name: 'framework',
					message: 'What would you like me to do?',
					choices: ['init', 'run', 'update', 'components', 'clone'],
				}
			];

			// Function to initialize the project
			async function askForCommand() {
				try {

					// 1. import
					const inquirer = await Utils.getInquirer();

					// 2. Prompt the user with the question and wait for the response
					const answers = await inquirer.prompt(questions);

					// 3. Display the selected framework
					console.log(`You selected: ${answers.framework}`);

					return answers.framework;

				}
                catch (error)
                {
					if (error.name === 'ExitPromptError')
					{

						// 1. report
						console.log('\n');
						console.log(`┌───`);
						console.log(`│`);
                        console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - Halt request granted!`);
                        console.log(`│`);
                        console.log(`└───`);

						// 2. exit
						process.exit(0);
					}
					else
					{
						// 1. report
						console.error("Error during project initialization:", error);
					}
				}
			}

			// Run the function
			sCommand = await askForCommand();
		}


		// Determine the target directory for initialization
        let sTargetDir;
        const executionDir = process.cwd();

		// Check if the script is running in the Mimoto npm package
		let isMimotoPackage = false;
		try {
			const packageJsonPath = path.join(executionDir, 'package.json');
			if (fs.existsSync(packageJsonPath)) {
				
				const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
				isMimotoPackage = packageJson.name === 'mimoto'; // Replace 'mimoto' with the actual package name if different
			}
		} catch (error) {
			console.error("Error reading package.json:", error);
		}

		if (isMimotoPackage) {
			// We're running from the Mimoto npm package directory
			sTargetDir = path.join(executionDir, 'cache');
			// Ensure the cache directory exists
			if (!fs.existsSync(sTargetDir)) {
				fs.mkdirSync(sTargetDir);
			}
		} else {
			// We're running from elsewhere, use the current directory
			sTargetDir = process.cwd();
		}


		let mimotoDistributor;
		let bDefaultConfig = false;
		const configFile = path.join(sTargetDir, 'mimoto.config.json');


		// 4. load configuration file mimoto.config.json
		const config = (() =>
		{
			// a. get root directory
			// let sRootDir = '';
			// const args = process.argv.slice(2); // removes the first two default elements
			// args.forEach((val, index) => { if (val === '-root') { sRootDir = args[index + 1]; } });
			// const RUNTIME_ROOT = path.join(process.cwd(), sRootDir);

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
					const targetConfigPath = path.join(sTargetDir, 'mimoto.config.json');

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


		// Check which command was passed and call the appropriate function
		switch (sCommand.toLowerCase()) {
			case 'init':


				let initProject = new InitProject(config, bDefaultConfig);
				initProject.init(sTargetDir);

				break;

			case 'clone':

				// check if args 0 en 1 gezet en exist?
				new CloneFile(aArgs[0], aArgs[1]);

				break;


			case 'components':

				// check if args 0 en 1 gezet en exist?
				const componentInstaller = new InstallComponents(sTargetDir);
				componentInstaller.install();

				break;

			case 'update':


				// 5. distribute Mimoto.js
				mimotoDistributor = new DistributeMimoto(config);

				// 6. distribute
				mimotoDistributor.distribute(sTargetDir);

				break;

			case 'compile':


			// mimoto run

			default:



				// 7. setup template combiner
				const templateCombiner = new CombineTemplates(config);

				break;
		}
	}

	/**
	 * Set up SIGINT handler
	 * @private
	 */
	_setupSigintHandler()
	{
		if (process.platform === "win32") {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			rl.on("SIGINT", () => {
				process.emit("SIGINT");
			});
		}

		process.on("SIGINT", () => {

			console.log('\n');
			console.log(`┌───`);
			console.log(`│`);
			console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - Halt request granted!`);
			console.log(`│`);
			console.log(`└───`);

			process.exit(0);
		});
	}

}

module.exports = Startup;

