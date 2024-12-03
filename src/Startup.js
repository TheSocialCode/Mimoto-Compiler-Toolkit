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
		// 1. init (moved to private function to allow async)
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
					name: 'command',
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
					console.log(`You selected: ${answers.command}`); // #TODO - Show the selected framework

					return answers.command;

				}
                catch (error)
                {
                    Utils.handleError(error, 'Error during project initialization');
				}
			}

			// Run the function
			sCommand = await askForCommand();
		}


		// Check which command was passed and call the appropriate function
		switch (sCommand.toLowerCase())
		{
			case 'init':

				// 1. init
				let initProject = new InitProject();

				// 2. run
				await initProject.init();

				break;

			default:


				// #TODO - no command = run / compile

				// #TODO - validate config (first time automatically run init?



				switch (sCommand.toLowerCase())
				{
					case 'clone':

						// check if args 0 en 1 gezet en exist?
						new CloneFile(aArgs[0], aArgs[1]);

						break;


					case 'components':

						// check if args 0 en 1 gezet en exist?
						const componentInstaller = new InstallComponents();
						componentInstaller.install();

						break;

					case 'update':

						// 5. distribute Mimoto.js
						let mimotoDistributor = new DistributeMimoto(config);

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
	}

}

module.exports = Startup;

