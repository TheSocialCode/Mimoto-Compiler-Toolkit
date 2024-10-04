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

// 3. import 3rd party classes
const inquirer = require('inquirer');


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
        // 1. update inquirer to latest version

        if (!sCommand)
        {
            const questions = [
                {
                    type: 'list',
                    name: 'framework',
                    message: 'What would you like me to do?',
                    choices: ['run', 'clone', 'init'],
                }
            ];

// Function to initialize the project
            async function init() {
                try {
                    // Prompt the user with the question and wait for the response
                    const answers = await inquirer.prompt(questions);

                    // Display the selected framework
                    console.log(`You selected: ${answers.framework}`);

                    return answers.framework;

                } catch (error) {
                    console.error("Error during project initialization:", error);
                }
            }

// Run the function
            sCommand = init();
        }


        // Check which command was passed and call the appropriate function
        switch (sCommand.toLowerCase()) {
            case 'init':


                let initProject = new InitProject();


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


                console.log('sTargetDir = ', sTargetDir);


                initProject.init(sTargetDir);

                break;

            case 'clone':

                // check if args 0 en 1 gezet en exist?
                new CloneFile(aArgs[0], aArgs[1]);

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



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------




}

module.exports = Startup;