/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */

// Import core classes
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const shell = require('shelljs');
const { exec, spawn } = require('child_process');
const readline = require('readline');
const firebase = require('firebase-tools');

// Import Mimoto util classes
const CompilerUtils = require('../utils/CompilerUtils');

class InitProject
{
	constructor() {
        this.installChoice = null;
    }

    /**
     * Checks for existing files and prompts the user for installation preferences
     * @param {string} targetDir - The target directory for installation
     * @returns {Promise<string>} The user's choice: 'clean', 'selective', or 'skip'
     */
    async checkExistingFiles(targetDir) {
        const files = await fs.readdir(targetDir);
        const existingFiles = files.filter(file => !file.startsWith('.'));

        if (existingFiles.length === 0) {
            return 'clean'; // No existing files, proceed with clean install
        }

		console.log('\n');
        console.log('The following files/folders already exist in the target directory:');
        existingFiles.forEach(file => console.log(`- ${file}`));
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
        switch (this.installChoice) {
            case 'clean':
                await fs.copy(sourcePath, destPath, { overwrite: true });
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
            const files = await fs.readdir(sourceDir);

            for (const file of files) {
                const sourcePath = path.join(sourceDir, file);
                const destPath = path.join(targetDir, file);
                await this.handleFileOperation(sourcePath, destPath);
            }

            console.log('File syncing completed successfully.');

            // Ask if npm install should be run
            const shouldInstall = await this.shouldRunNpmInstall();

            if (shouldInstall) {
                await this.runNpmInstall(targetDir);
            }

            // Example: Initialize Firebase Emulators
            await this.initializeFirebaseEmulators();

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
	 * @returns {Promise<void>}
	 */
	async initializeFirebaseEmulators() {
		console.log('Initializing Firebase Emulators...');
		
		try {
			await firebase.init({
				feature: 'emulators',
				interactive: true
			});
			console.log('Firebase Emulators initialized successfully.');
		} catch (error) {
			console.error('Error initializing Firebase Emulators:', error.message);
			throw new Error('Firebase Emulators initialization failed');
		}
	}

	/**
	 * Checks for existing files and prompts the user for installation preferences
	 * @param {string} targetDir - The target directory for installation
	 * @returns {Promise<string>} The user's choice: 'clean', 'selective', or 'skip'
	 */
	async checkExistingFiles(targetDir) {
		const files = await fs.readdir(targetDir);
		const existingFiles = files.filter(file => !file.startsWith('.'));

		if (existingFiles.length === 0) {
			return 'clean'; // No existing files, proceed with clean install
		}

		console.log('The following files/folders already exist in the target directory:');
		console.log('\n');
		existingFiles.forEach(file => console.log(`- ${file}`));
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
		switch (this.installChoice) {
			case 'clean':
				await fs.copy(sourcePath, destPath, { overwrite: true });
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
			const files = await fs.readdir(sourceDir);

			for (const file of files) {
				const sourcePath = path.join(sourceDir, file);
				const destPath = path.join(targetDir, file);
				await this.handleFileOperation(sourcePath, destPath);
			}

			console.log('File syncing completed successfully.');

			// Ask if npm install should be run
			const shouldInstall = await this.shouldRunNpmInstall();

			if (shouldInstall) {
				await this.runNpmInstall(targetDir);
			}

			// Example: Initialize Firebase Emulators
			await this.initializeFirebaseEmulators();

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
		console.log('\n');
		const { runNpmInstall } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'runNpmInstall',
				message: 'Do you want to run "npm install" before starting the emulators?',
				default: true
			}
		]);
		return runNpmInstall;
	}

	/**
	 * Runs npm install
	 * @param {string} targetDir - The target directory for installation
	 * @returns {Promise<void>}
	 */
	async runNpmInstall(targetDir) {
		return new Promise((resolve, reject) => {
			console.log('Running npm install...');
			
			const npmInstall = spawn('npm', ['install'], { cwd: targetDir, stdio: 'inherit', shell: true });

			npmInstall.on('close', (code) => {
				if (code === 0) {
					console.log('npm install completed successfully.');
					resolve();
				} else {
					console.error(`npm install process exited with code ${code}`);
					reject(new Error(`npm install failed with code ${code}`));
				}
			});

			npmInstall.on('error', (error) => {
				console.error(`Error during npm install: ${error.message}`);
				reject(error);
			});
		});
	}

}

module.exports = InitProject;