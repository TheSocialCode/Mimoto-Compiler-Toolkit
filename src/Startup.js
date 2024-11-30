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
		// 1. init (moved to private function to allow async)
		this.init(sCommand);
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------


	async init(sCommand)
	{
		if (!sCommand)
		{
			const questions = [
				{
					type: 'list',
					name: 'framework',
					message: 'What would you like me to do?',
					choices: ['run', 'clone', 'init', 'components'],
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
		const cliPath = path.resolve(process.argv[1]);
		const cliDir = path.dirname(cliPath);

		if (cliDir === process.cwd()) {
			// We're running from the directory containing cli.js
			sTargetDir = path.join(cliDir, 'cache');
			// Ensure the cache directory exists
			if (!fs.existsSync(sTargetDir)) {
				fs.mkdirSync(sTargetDir);
			}
		} else {
			// We're running from elsewhere, use the current directory
			sTargetDir = process.cwd();
		}


        console.log('sTargetDir =', sTargetDir);
        return;



		// Check which command was passed and call the appropriate function
		switch (sCommand.toLowerCase()) {
			case 'init':


				let initProject = new InitProject();
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

			case 'compile':


			// mimoto run

			default:

				// 4. load configuration file mimoto.config.json
				const config = (() =>
				{
					// a. get root directory
					let sRootDir = '';
					const args = process.argv.slice(2); // removes the first two default elements
					args.forEach((val, index) => { if (val === '-root') { sRootDir = args[index + 1]; } });
					const RUNTIME_ROOT = path.join(process.cwd(), sRootDir);

					// b. load
					try
					{
						// I. point to the directory where the script is executed, not where it is located
						const configFile = path.join(RUNTIME_ROOT, 'mimoto.config.json');

						// II. load and convert
						const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

						// III. extend
						config.RUNTIME_ROOT = RUNTIME_ROOT;

						// IV. send
						return config;

					} catch(error) {

						// I. report error
						console.log('🚨 - WARNING - Missing config file \u001b[1m\u001B[31mmimoto.config.json\u001B[0m\u001b[22m in project root');

						// II. exit
						process.exit(1);
					}
				})();

				// 5. distribute Mimoto.js
				const mimotoDistributor = new DistributeMimoto(config);

				// 6. distribute
				let distributor = mimotoDistributor.distribute();

				// 7. setup template combiner
				distributor.then(() => { const templateCombiner = new CombineTemplates(config); })

				break;
		}
	}

}

module.exports = Startup;

