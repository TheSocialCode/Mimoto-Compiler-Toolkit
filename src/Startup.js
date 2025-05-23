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

						// Ask user for source and destination details
						const { sourceFile, destinationFile } = await this.askForCloneDetails();

						// Use the provided details
						new CloneFile(sourceFile, destinationFile);

						break;


					case 'components':

						const componentInstaller = new InstallComponents();
						await componentInstaller.install();

						break;

					case 'update':
						// Ask for confirmation before updating
						const inquirer = await Utils.getInquirer();
						const { shouldUpdate } = await inquirer.prompt([{
							type: 'confirm',
							name: 'shouldUpdate',
							message: 'Do you want to update to the latest Mimoto.js?',
							default: true
						}]);

						if (shouldUpdate) {
							// 5. distribute Mimoto.js
							const mimotoDistributor = new DistributeMimoto();
							// 6. distribute
							mimotoDistributor.distribute(Utils.getProjectRoot());

						} else {
							console.log('Update cancelled.');
						}
						break;

					case 'compile':

					// mimoto run

					default:


						// 7. setup template combiner
						const templateCombiner = new CombineTemplates();

						break;
				}

		}
	}

	async askForCloneDetails() {
		const inquirer = await Utils.getInquirer();
		const questions = [
			{
				type: 'input',
				name: 'sourceFile',
				message: 'Please enter the path of the file to be copied:',
			},
			{
				type: 'input',
				name: 'destinationFile',
				message: 'Please enter the destination path and filename:',
			}
		];
		return await inquirer.prompt(questions);
	}

}

module.exports = Startup;

