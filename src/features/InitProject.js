/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */

// Import core classes
const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');
const readline = require('readline');
const firebase = require('firebase-tools');
const ora = require('ora');



class InitProject
{
	constructor() {
        this.installChoice = null;
		this._inquirer = null;
		// Set up SIGINT handler
		this.setupSigintHandler();
	}

	setupSigintHandler() {
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
			console.log("\nInstallation cancelled by user.");
			process.exit(0);
		});
	}


	async getInquirer() {
		if (!this._inquirer) {
		  const inquirerModule = await import('inquirer');
		  this._inquirer = inquirerModule.default;
		}
		return this._inquirer;
	  }

    /**
     * Checks for existing files and prompts the user for installation preferences
     * @param {string} targetDir - The target directory for installation
     * @returns {Promise<string>} The user's choice: 'clean', 'selective', or 'skip'
     */
    async checkExistingFiles(targetDir) {

		console.error('🚨 - Is this code still in use?');

		const inquirer = await this.getInquirer();
        const files = await fs.readdir(targetDir);
        const existingFiles = files.filter(file => !file.startsWith('.'));

        if (existingFiles.length === 0) {
            return 'clean'; // No existing files, proceed with clean install
        }

		console.log('\n');
		console.log('┌───\n│\n');
		console.log('🌱 - \x1b[1mMimoto\x1b[0m 💬 - The following files/folders already exist in the target directory:');
        existingFiles.forEach(file => console.log(`│    - ${file}`));
		console.log('│\n');
		console.log('└───');
		console.log('\n');

        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'How would you like to proceed?',
                choices: [
                    { name: 'Perform a clean install (overwrite everything)', value: 'clean' },
                    { name: 'Decide per folder/file', value: 'selective' },
                    { name: 'Skip file syncing altogether', value: 'skip' },
                    { name: 'Cancel installation', value: 'cancel' }
                ]
            }
        ]);

        return choice;
    }

    /**
     * Handles file operations based on user's choice
     * @param {string} sourcePath - Source path of the file/folder
     * @param {string} destPath - Destination path for the file/folder
     */
    async handleFileOperation(sourcePath, destPath) {
		const inquirer = await this.getInquirer();
        switch (this.installChoice) {
            case 'clean':
                const cacheDir = path.dirname(destPath);
                const sourceDir = path.dirname(sourcePath);

                // Remove the entire cache folder
                await fs.remove(cacheDir);
                
                // Recreate the cache folder
                await fs.ensureDir(cacheDir);
                
                // Copy all files from the source directory to the cache directory
                await fs.copy(sourceDir, cacheDir, { overwrite: true });

                // Log the list of copied files for debugging
                const copiedFiles = await fs.readdir(cacheDir);

                break;
            case 'selective':
                if (await fs.pathExists(destPath)) {
                    const { overwrite } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'overwrite',
                            message: `Overwrite ${destPath}?`,
                            default: false
                        }
                    ]);
                    if (overwrite) {
                        await fs.copy(sourcePath, destPath, { overwrite: true });
                    }
                } else {
                    await fs.copy(sourcePath, destPath);
                }
                break;
            case 'skip':
                // Do nothing
                break;
        }
    }

    /**
     * Initializes the project
     * @param {string} targetDir - The target directory for installation
     */
    async init(targetDir) {
		const inquirer = await this.getInquirer();

        this.installChoice = await this.checkExistingFiles(targetDir);

        if (this.installChoice === 'cancel') {
            console.log('Installation cancelled.');
            process.exit(0); // Exit the process with a success code
        }

        // Ask for project details
        const { projectName, projectAuthor } = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: 'Enter your project name:',
                validate: input => input.trim() !== '' || 'Project name cannot be empty'
            },
            {
                type: 'input',
                name: 'projectAuthor',
                message: 'Enter the project author:',
                validate: input => input.trim() !== '' || 'Project author cannot be empty'
            }
        ]);

        // Sanitize and PascalCase the project name for filenames
        const sanitizedProjectName = projectName
            .replace(/[^a-zA-Z0-9]/g, '') // Remove invalid characters
            .replace(/^\d+/, ''); // Remove leading digits
        const pascalCaseProjectName = sanitizedProjectName.charAt(0).toUpperCase() + sanitizedProjectName.slice(1);

        // Function to replace variables in a file
        const replaceVariablesInFile = async (filePath) => {
            let content = await fs.readFile(filePath, 'utf8');
            content = content.replace(/{{PROJECT_NAME}}/g, pascalCaseProjectName);
            content = content.replace(/{{PROJECT_AUTHOR}}/g, projectAuthor);
            await fs.writeFile(filePath, content, 'utf8');
        };

        // Add this function to the file operations
        this.handleFileOperation = async (sourcePath, destPath) => {
            await this.handleFileOperation.call(this, sourcePath, destPath);
            if (path.basename(destPath) === 'webpack.config.js') {
                await replaceVariablesInFile(destPath);
            }
        };
        console.log(`Proceeding with ${this.installChoice} install...`);

        // Define the source directory for your boilerplates
        const sourceDir = path.join(__dirname, '..', '..', 'boilerplates', 'project');

        // Check if the source directory exists
        if (!await fs.pathExists(sourceDir)) {
            console.error(`Error: Boilerplate directory not found at ${sourceDir}`);
            console.log('Please ensure that the boilerplate directory exists and try again.');
            process.exit(1);
        }

        try {

            if (this.installChoice === 'skip') {
                console.log('\n');
                console.log('🌱 - \x1b[1mMimoto\x1b[0m 💬 - File syncing skipped.');
            } else {
                const files = await fs.readdir(sourceDir);

                for (const file of files) {
                    const sourcePath = path.join(sourceDir, file);
                    const destPath = path.join(targetDir, file);
                    await this.handleFileOperation(sourcePath, destPath);
                }

                console.log('\n');
                console.log('🌱 - \x1b[1mMimoto\x1b[0m 💬 - File syncing completed successfully.');
            }

            // Ask if npm install should be run
            const shouldInstall = await this.shouldRunNpmInstall();

            if (shouldInstall) {
                await this.runNpmInstall(targetDir);
            }

            // Example: Initialize Firebase Emulators
            await this.initializeFirebaseEmulators(targetDir);

        } catch (error) {
            console.error('Error during file operations:', error);
            process.exit(1);
        }
    }

	/**
	 * Copy template files and folders with user confirmation for existing ones.
	 * @param {string} sSourcePath - Path of the source directory containing the template files.
	 * @param {string} sDestinationPath - Path of the destination directory.
	 */
	async copyTemplateWithConfirmation(sSourcePath, sDestinationPath)
	{
		const inquirer = await this.getInquirer();
		try {
			const aItems = fs.readdirSync(sSourcePath);

			for (const sItem of aItems)
			{
				const sSrcItemPath = path.join(sSourcePath, sItem);
				const sDestItemPath = path.join(sDestinationPath, sItem);

				try {
					if (fs.lstatSync(sSrcItemPath).isDirectory())
					{
						if (fs.existsSync(sDestItemPath))
						{
							// Prompt the user for confirmation to overwrite the directory
							const xFolderAnswer = await inquirer.prompt([
								{
									type: 'confirm',
									name: 'bOverwriteFolder',
									message: `The folder "${sItem}" already exists in the target directory. Do you want to overwrite it?`,
									default: false,
								},
							]);

							if (!xFolderAnswer.bOverwriteFolder)
							{
								console.log(`Skipping folder: ${sItem}`);
								continue; // Skip this folder and move to the next one
							}
						}

						// Ensure the destination folder exists
						fs.ensureDirSync(sDestItemPath);

						// Copy the folder contents recursively with user confirmation for each file
						await this.copyTemplateWithConfirmation(sSrcItemPath, sDestItemPath);
					}
					else
					{
						// Check if the destination file already exists
						if (fs.existsSync(sDestItemPath))
						{
							// Prompt the user for confirmation to overwrite the file
							const xFileAnswer = await inquirer.prompt([
								{
									type: 'confirm',
									name: 'bOverwriteFile',
									message: `The file "${sItem}" already exists in the target directory. Do you want to overwrite it?`,
									default: false,
								},
							]);

							if (!xFileAnswer.bOverwriteFile)
							{
								console.log(`Skipping file: ${sItem}`);
								continue; // Skip this file and move to the next one
							}
						}

						// Copy the file to the destination
						try {
							fs.copySync(sSrcItemPath, sDestItemPath, { overwrite: true });
							console.log(`Copied file: ${sItem} to ${sDestinationPath}`);
						} catch (copyError) {
							console.error(`Error copying file ${sItem}: ${copyError.message}`);
							const { retry } = await inquirer.prompt([
								{
									type: 'confirm',
									name: 'retry',
									message: `Do you want to retry copying ${sItem}?`,
									default: true,
								}
							]);
							if (retry) {
								fs.copySync(sSrcItemPath, sDestItemPath, { overwrite: true });
								console.log(`Successfully copied file on retry: ${sItem} to ${sDestinationPath}`);
							} else {
								console.log(`Skipped file: ${sItem}`);
							}
						}
					}
				} catch (itemError) {
					console.error(`Error processing item ${sItem}: ${itemError.message}`);
					console.log(`Skipping item: ${sItem}`);
				}
			}
		} catch (error) {
			console.error(`Failed to copy template: ${error.message}`);
			throw error; // Re-throw the error to be caught by the calling function
		}
	}

	/**
	 * Initializes Firebase Emulators with interactive input
	 * @param {string} targetDir - The target directory for installation
	 * @returns {Promise<void>}
	 */
	async initializeFirebaseEmulators(targetDir) {
		console.log('┌───');
		console.log('│');
		console.log('│   Initializing Firebase Emulators...');
		console.log('│');
		console.log('└───');
		console.log('\n');
		
		const originalDir = process.cwd();
		
		try {
			// Change to the target directory
			process.chdir(targetDir);
			
			await firebase.init({
				feature: 'emulators',
				interactive: true
			});

			console.log('┌───');
			console.log('│');
			console.log('│   Firebase Emulators initialized successfully.');
			console.log('│');
		} catch (error) {
			console.log('┌───');
			console.log('│');
			console.log(`│   Error initializing Firebase Emulators: ${error.message}`);
			console.log('│');
			throw new Error('Firebase Emulators initialization failed');
		} finally {
			// Change back to the original directory
			process.chdir(originalDir);
			console.log('└───');
		}
	}

	/**
	 * Checks for existing files and prompts the user for installation preferences
	 * @param {string} targetDir - The target directory for installation
	 * @returns {Promise<string>} The user's choice: 'clean', 'selective', or 'skip'
	 */
	async checkExistingFiles(targetDir) {

		const inquirer = await this.getInquirer();
		const files = await fs.readdir(targetDir);
		const existingFiles = files.filter(file => !file.startsWith('.'));

		if (existingFiles.length === 0) {
			return 'clean'; // No existing files, proceed with clean install
		}

		console.log('🌱 - \x1b[1mMimoto\x1b[0m 💬 - The following files/folders already exist in the target directory:');
		console.log('\n');
		console.log('┌───\n│');

		// Separate folders and files
		const folders = [];
		const filesList = [];

		existingFiles.forEach(file => {
			const fullPath = path.join(targetDir, file);
			if (fs.statSync(fullPath).isDirectory()) {
				folders.push(file);
			} else {
				filesList.push(file);
			}
		});

		// Sort and print folders first
		folders.sort().forEach(folder => {
			console.log(`│    📂 ${folder}`);
		});

		// Then sort and print files
		filesList.sort().forEach(file => {
			console.log(`│    - ${file}`);
		});

		console.log('│');
		console.log('└───');
		console.log('\n');
		
		const { choice } = await inquirer.prompt([
			{
				type: 'list',
				name: 'choice',
				message: 'How would you like to proceed?',
				choices: [
					{ name: 'Perform a clean install (overwrite everything)', value: 'clean' },
					{ name: 'Decide per folder/file', value: 'selective' },
					{ name: 'Skip file syncing altogether', value: 'skip' },
					{ name: 'Cancel installation', value: 'cancel' }
				]
			}
		]);

		return choice;
	}

	/**
	 * Handles file operations based on user's choice
	 * @param {string} sourcePath - Source path of the file/folder
	 * @param {string} destPath - Destination path for the file/folder
	 */
	async handleFileOperation(sourcePath, destPath) {

		const inquirer = await this.getInquirer();

		switch (this.installChoice) {
			case 'clean':
				const cacheDir = path.dirname(destPath);
                const sourceDir = path.dirname(sourcePath);

                // Remove the entire cache folder
                await fs.remove(cacheDir);
                
                // Recreate the cache folder
                await fs.ensureDir(cacheDir);
                
                // Copy all files from the source directory to the cache directory
                await fs.copy(sourceDir, cacheDir, { overwrite: true });

                // Log the list of copied files for debugging
                const copiedFiles = await fs.readdir(cacheDir);

                break;
			case 'selective':
				if (await fs.pathExists(destPath)) {
					const { overwrite } = await inquirer.prompt([
						{
							type: 'confirm',
							name: 'overwrite',
							message: `Overwrite ${destPath}?`,
							default: false
						}
					]);
					if (overwrite) {
						await fs.copy(sourcePath, destPath, { overwrite: true });
					}
				} else {
					await fs.copy(sourcePath, destPath);
				}
				break;
			case 'skip':
				// Do nothing
				break;
		}
	}

	/**
	 * Initializes the project
	 * @param {string} targetDir - The target directory for installation
	 */
	async init(targetDir) {
		this.installChoice = await this.checkExistingFiles(targetDir);

		if (this.installChoice === 'cancel') {
			console.log('Installation cancelled.');
			process.exit(0); // Exit the process with a success code
		}

		console.log(`Proceeding with ${this.installChoice} install...`);

		// Define the source directory for your boilerplates
		const sourceDir = path.join(__dirname, '..', '..', 'boilerplates', 'project');

		// Check if the source directory exists
		if (!await fs.pathExists(sourceDir)) {
			console.error(`Error: Boilerplate directory not found at ${sourceDir}`);
			console.log('Please ensure that the boilerplate directory exists and try again.');
			process.exit(1);
		}

		try {
			if (this.installChoice === 'skip') {
                console.log('\n');
                console.log('🌱 - \x1b[1mMimoto\x1b[0m 💬 - File syncing skipped.');
            } else {
                const files = await fs.readdir(sourceDir);

                for (const file of files) {
                    const sourcePath = path.join(sourceDir, file);
                    const destPath = path.join(targetDir, file);
                    await this.handleFileOperation(sourcePath, destPath);
                }

                console.log('\n');
                console.log('🌱 - \x1b[1mMimoto\x1b[0m 💬 - File syncing completed successfully.');
            }

			// Ask if npm install should be run
			const shouldInstall = await this.shouldRunNpmInstall();

			if (shouldInstall) {
				await this.runNpmInstall(targetDir);
			}

			// Example: Initialize Firebase Emulators
			await this.initializeFirebaseEmulators(targetDir);

		} catch (error) {
			console.error('Error during file operations:', error);
			process.exit(1);
		}
	}

	/**
	 * Prompts the user to run npm install
	 * @returns {Promise<boolean>}
	 */
	async shouldRunNpmInstall() {
		const inquirer = await this.getInquirer();

		console.log('\n');
		const answer = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'runNpmInstall',
				message: 'Do you want to run npm install now?',
				default: true
			}
		]);

		return answer.runNpmInstall;
	}

	/**
	 * Runs npm install
	 * @param {string} targetDir - The target directory for installation
	 * @returns {Promise<void>}
	 */
	async runNpmInstall(targetDir) {
		return new Promise((resolve, reject) => {
			console.log('Running npm install...');
			
			console.log('\n');

			const spinner = ora('Installing packages...').start();

			const npmInstall = spawn('npm', ['install', '--loglevel=error'], { 
				cwd: targetDir, 
				shell: true,
				stdio: ['inherit', 'pipe', 'pipe'] // Pipe stdout and stderr
			});

			let output = '┌───\n│\n';

			const processLine = (line) => {
				if (line.trim() && !line.toLowerCase().includes('warn')) {
					const indentedLine = line.replace(/^(\s*)(.*)/, (_, indent, content) => {
						return '│   ' + indent + content;
					});
					output += indentedLine + '\n│\n';
					spinner.text = 'Installing packages: ' + line.trim();
				}
			};

			npmInstall.stdout.on('data', (data) => {
				data.toString().split('\n').forEach(processLine);
			});

			npmInstall.stderr.on('data', (data) => {
				data.toString().split('\n').forEach(processLine);
			});

			npmInstall.on('close', (code) => {
				spinner.stop();
				output += '└───\n';

				console.log(output);

				if (code === 0) {
					console.log('\n🌱 - \x1b[1mMimoto\x1b[0m 💬 - npm install completed successfully.\n');
					resolve();
				} else {
					console.log('\n🌱 - \x1b[1mMimoto\x1b[0m ⚠️ - npm install failed.');
					console.error(`npm install process exited with code ${code}\n`);
					reject(new Error(`npm install failed with code ${code}`));
				}
			});

			npmInstall.on('error', (error) => {
				spinner.stop();
				console.error(`Error during npm install: ${error.message}`);
				reject(error);
			});
		});
	}

}

module.exports = InitProject;