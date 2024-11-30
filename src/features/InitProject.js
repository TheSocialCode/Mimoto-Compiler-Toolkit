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
const Utils = require('./Utils');
const InstallComponents = require('./InstallComponents');
const DistributeMimoto = require('./DistributeMimoto');


class InitProject
{

	// data
	_config = null;
	_bDefaultConfig = false;


	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


	constructor(config, bDefaultConfig) {

		// 1. store
		this._config = config;
		this._bDefaultConfig = bDefaultConfig;


        this.installChoice = null;
		this.project = {
			id: '',
			name: '',
			author: '',
			email: ''
		};
	}




	// ----------------------------------------------------------------------------
	// --- Public methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


/**
     * Initializes the project
     * @param {string} sTargetDir - The target directory for installation
     */
	async init(sTargetDir)
	{

		const inquirer = await Utils.getInquirer();
		const configPath = path.join(sTargetDir, 'mimoto.config.json');

		let config = {};
		let bHasExistingConfig = false;
		if (await fs.pathExists(configPath)) {
			try {
				config = JSON.parse(await fs.readFile(configPath, 'utf8'));
				bHasExistingConfig = true;
			} catch (error) {
				console.error('Error reading mimoto.config.json:', error);
			}
		}

		// Ask for project name, author name, and author email if not in config
		if (!config.name || !config.author || !config.email) {
			const getDefaults = (() => {
				const currentDir = process.cwd();
				const targetBaseName = path.basename(sTargetDir);
				
				// Check if we're in the root of the Mimoto npm package
				const isMimotoPackageRoot = (() => {
					try {
						const packageJsonPath = path.join(currentDir, 'package.json');
						if (fs.existsSync(packageJsonPath)) {
							const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
							return packageJson.name === 'mimoto';
						}
					} catch (error) {
						console.error('Error reading package.json:', error);
					}
					return false;
				})();

				// Check if we're in the development environment
				if (isMimotoPackageRoot && targetBaseName === 'cache') {
					return {
						name: "Mimoto Project Boilerplate",
						author: "Sebastian Kersten",
						email: "sebastian@thesocialcode.com"
					};
				}
				
				return {
					name: config.name || targetBaseName,
					author: config.author || '',
					email: config.email || ''
				};
			})();


			let answers;

			// Use these defaults in the prompts
			try {
				answers = await inquirer.prompt([
					{
						type: 'input',
						name: 'name',
						message: 'Enter the project name:',
						default: getDefaults.name
					},
					{
						type: 'input',
						name: 'author',
						message: 'Enter the author name:',
						default: getDefaults.author
					},
					{
						type: 'input',
						name: 'email',
						message: 'Enter the author email:',
						default: getDefaults.email,
						validate: function(email) {
							// Simple email validation
							const valid = /^\S+@\S+\.\S+$/.test(email);
							return valid || 'Please enter a valid email address';
						}
					}
				]);
			} catch (error) {

				Utils.handleError(error);
			}

			config.name = answers.name;
			config.author = answers.author;
			config.email = answers.email;
		}

		this.project.name = config.name;
		this.project.author = config.author;
		this.project.email = config.email;

		this.project.id = config.name
			.toLowerCase()
			.replace(/\s+/g, '-')        // Replace spaces with hyphens
			.replace(/[^a-z0-9-_]/g, '') // Remove any characters that are not lowercase alphanumeric, hyphens, or underscores
			.replace(/^[^a-z]/, 'p')     // Ensure it starts with a letter (prepend 'p' if it doesn't)
			.substring(0, 214);          // Truncate to 214 characters (npm has a 214 character limit for package names)


		// console.log(`\n🌱 - \x1b[1mMimoto\x1b[0m 💬 - Initializing project: \x1b[1m\x1b[92m${this.project.name}\x1b[0m by ${this.project.author} (${this.project.email})\n`);


		console.log(`┌───`);
		console.log(`│`);
		console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - Initializing project:`);
		console.log(`│`);
		console.log(`│       \x1b[1m\x1b[92m${this.project.name}\x1b[0m`);
		console.log(`│   	 \x1B[3mby ${this.project.author} (${this.project.email})\x1B[0m`);

		if (bHasExistingConfig) {
			console.log(`│`);
			console.log('│       \x1B[3m(From existing mimoto.config.json)\x1B[0m');
		}

		console.log(`│`);
		console.log(`└───`);

		this.installChoice = await this.checkExistingFiles(sTargetDir);

		if (this.installChoice === 'cancel') {
			console.log('Installation cancelled.');
			process.exit(0); // Exit the process with a success code
		}

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
				console.log(`┌───`);
				console.log(`│`);
				console.log(`│   🌱 - \x1b[1mMimoto\x1b[0m 💬 - File syncing skipped.`);
				console.log(`│`);
				console.log(`└───`);
			} else {
				const files = await fs.readdir(sourceDir);

				for (const file of files) {
					const sourcePath = path.join(sourceDir, file);
					const destPath = path.join(sTargetDir, file);
					
					// // Skip mimoto.config.json and package.json if they already exist
					// if ((file === 'mimoto.config.json' || file === 'package.json') && await fs.pathExists(destPath)) {
					// 	console.log(`🌱 - \x1b[1mMimoto\x1b[0m 💬 - Skipping existing ${file}`);
					// 	continue;
					// }
					
					await this._handleFileOperation(sourcePath, destPath, sTargetDir);
				}

				console.log(`┌───`);
				console.log(`│`);
				console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - File syncing completed successfully.`);
				console.log(`│`);
				console.log(`└───`);
			}


			// 5. distribute Mimoto.js
			const mimotoDistributor = new DistributeMimoto(this._config);

			// 6. distribute
			mimotoDistributor.distribute(sTargetDir);

			
		// You might want to use projectName and authorName in your file operations
			// For example, updating package.json with these details
			await this._updatePackageJson(sTargetDir);

			try {

				// Ask if npm install should be run
				const shouldInstall = await this.shouldRunNpmInstall();

				if (shouldInstall) {
					await this._runNpmInstall(sTargetDir);
				}
			} catch (error) {
				Utils.handleError(error);
			}
			
			// Ask user if they want to install components
			const { installComponents } = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'installComponents',
					message: 'Do you want to install any components?',
					default: true
				}
			]);

			if (installComponents) {
				// Initialize and run InstallComponents
				const installComponentsInstance = new InstallComponents(sTargetDir);
				await installComponentsInstance.install();
			} else {
				console.log('Skipping component installation.');
			}

			
			//let installEmulators;

			//try {

				// Ask user if they want to install Firebase Emulators
				const { installEmulators } = await inquirer.prompt([
					{
						type: 'confirm',
						name: 'installEmulators',
						message: 'Do you want to install and initialize Firebase Emulators?',
						default: true
					}
				]);

				// installEmulators = xInstallEmulators;

			// } catch (error) {
			// 	Utils.handleError(error);
			// }


			if (installEmulators) {
				// Initialize Firebase Emulators
				await this.initializeFirebaseEmulators(sTargetDir);
			} else {
				console.log('Skipping Firebase Emulators installation.');
			}

			console.log(`┌───`);
			console.log(`│`);
			console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - Installation completed successfully!`);
			console.log(`│`);
			console.log(`│  ✨`);
			console.log(`│`);
			console.log(`│     You can now run the Firebase Emulators:`);
			console.log(`│        \x1b[1mfirebase emulators:start\x1b[0m`);
			console.log(`│`);
			console.log(`│     This will start all configured Firebase Emulators.`);
			console.log(`│`);
			console.log(`│     You will be able to access the Firebase Emulator Suite UI at:`);
			console.log(`│        \x1b[1mhttp://localhost:4000\x1b[0m`);
			console.log(`│`);
			console.log(`│      Happy coding! 🚀`);
			console.log(`│`);
			console.log(`│`);
			console.log(`│    Run: \x1b[1mnpx mimoto run\x1b[0m`);
			console.log(`│`);
			console.log(`└───`);
			console.log(``);

		} catch (error) {
			console.error('Error during file operations:', error);
			process.exit(1);
		}
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------


    /**
     * Handles file operations based on user's choice
     * @param {string} sourcePath - Source path of the file/folder
     * @param {string} destPath - Destination path for the file/folder
     */
    async _handleFileOperation(sourcePath, destPath, sTargetDir) {
		const inquirer = await Utils.getInquirer();
        switch (this.installChoice) {
            case 'clean':
                const cacheDir = path.dirname(destPath);
                const sourceDir = path.dirname(sourcePath);

                // Remove the entire cache folder
                //await fs.emptyDir(cacheDir);
                
                // Recreate the cache folder
                //await fs.ensureDir(cacheDir);
                
                // Copy all files from the source directory to the cache directory
                await fs.copy(sourceDir, cacheDir, { overwrite: true });

                // Log the list of copied files for debugging
                const copiedFiles = await fs.readdir(cacheDir);

                break;
            case 'selective':

                if (await fs.pathExists(destPath)) {
                    const sourceStats = await fs.stat(sourcePath);

                    const getRelativePath = (fullPath) => {
                        const projectRoot = process.cwd();
                        const relativePath = path.relative(projectRoot, fullPath);
                        const sTargetDirName = path.basename(sTargetDir);
                        return relativePath.replace(new RegExp(`^${sTargetDirName}[\\/]`), '');
                    };

                    const relativeDestPath = getRelativePath(destPath);

                    if (sourceStats.isDirectory()) {
                        // Ask about overwriting the root folder first
                        const { overwriteRoot } = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'overwriteRoot',
                                message: `Overwrite folder 📂 ${relativeDestPath}?`,
                                default: false
                            }
                        ]);

                        if (overwriteRoot) {
                            const sourceContents = await fs.readdir(sourcePath);
                            const folders = sourceContents.filter(item => fs.statSync(path.join(sourcePath, item)).isDirectory());
                            const files = sourceContents.filter(item => fs.statSync(path.join(sourcePath, item)).isFile());

                            // Handle folders
                            for (const folder of folders) {
                                const sourceFolderPath = path.join(sourcePath, folder);
                                const destFolderPath = path.join(destPath, folder);
                                const relativeFolderPath = getRelativePath(destFolderPath);
                                if (await fs.pathExists(destFolderPath)) {
                                    const { overwriteFolder } = await inquirer.prompt([
                                        {
                                            type: 'confirm',
                                            name: 'overwriteFolder',
                                            message: `Overwrite folder 📂 ${relativeFolderPath}?`,
                                            default: false
                                        }
                                    ]);
                                    if (overwriteFolder) {
                                        await fs.copy(sourceFolderPath, destFolderPath, { overwrite: true });
                                    }
                                } else {
                                    await fs.copy(sourceFolderPath, destFolderPath);
                                }
                            }

                            // Handle files
                            for (const file of files) {
                                const sourceFilePath = path.join(sourcePath, file);
                                const destFilePath = path.join(destPath, file);
                                const relativeFilePath = getRelativePath(destFilePath);
                                if (await fs.pathExists(destFilePath)) {
                                    const { overwriteFile } = await inquirer.prompt([
                                        {
                                            type: 'confirm',
                                            name: 'overwriteFile',
                                            message: `Overwrite file ${relativeFilePath}?`,
                                            default: false
                                        }
                                    ]);
                                    if (overwriteFile) {
                                        await fs.copy(sourceFilePath, destFilePath, { overwrite: true });
                                    }
                                } else {
                                    await fs.copy(sourceFilePath, destFilePath);
                                }
                            }
                        }
                    } else {
                        const { overwrite } = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'overwrite',
                                message: `Overwrite ${relativeDestPath}?`,
                                default: false
                            }
                        ]);
                        if (overwrite) {
                            await fs.copy(sourcePath, destPath, { overwrite: true });
                        }
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
	 * Copy template files and folders with user confirmation for existing ones.
	 * @param {string} sSourcePath - Path of the source directory containing the template files.
	 * @param {string} sDestinationPath - Path of the destination directory.
	 */
	async copyTemplateWithConfirmation(sSourcePath, sDestinationPath)
	{
		const inquirer = await Utils.getInquirer();
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
	 * @param {string} sTargetDir - The target directory for installation
	 * @returns {Promise<void>}
	 */
	async initializeFirebaseEmulators(sTargetDir) {
		console.log('┌───');
		console.log('│');
		console.log('│   Initializing Firebase Emulators...');
		console.log('│');
		console.log('└───');
		console.log('\n');
		
		const originalDir = process.cwd();
		
		try {
			// Change to the target directory
			process.chdir(sTargetDir);
			
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
	 * @param {string} sTargetDir - The target directory for installation
	 * @returns {Promise<string>} The user's choice: 'clean', 'selective', or 'skip'
	 */
	async checkExistingFiles(sTargetDir) {

		const inquirer = await Utils.getInquirer();
		const files = await fs.readdir(sTargetDir);
		const existingFiles = files.filter(file => !file.startsWith('.'));

		if (existingFiles.length === 0 || existingFiles.length === 1 && this._bDefaultConfig) {
			return 'clean'; // No existing files, proceed with clean install
		}

		console.log('┌───');
		console.log('│');
		console.log('│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - The following files/folders already exist in the target directory:');
		console.log('│');

		// Separate folders and files
		const folders = [];
		const filesList = [];

		existingFiles.forEach(file => {
			const fullPath = path.join(sTargetDir, file);
			if (fs.statSync(fullPath).isDirectory()) {
				folders.push(file);
			} else {
				filesList.push(file);
			}
		});

		// Sort and print folders first
		folders.sort().forEach(folder => {
			console.log(`│       📂 ${folder}`);
		});

		// Then sort and print files
		filesList.sort().forEach(file => {
			console.log(`│       - ${file}`);
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
	 * Prompts the user to run npm install
	 * @returns {Promise<boolean>}
	 */
	async shouldRunNpmInstall() {
		const inquirer = await Utils.getInquirer();

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
	 * @param {string} sTargetDir - The target directory for installation
	 * @returns {Promise<void>}
	 */
	async _runNpmInstall(sTargetDir) {
		return new Promise((resolve, reject) => {

			console.log(`┌───`);
            console.log(`│`);
            console.log(`│    🌱 - \x1b[1mMimoto\x1b[0m 💬 - Running npm install...`);
            console.log(`│`);
            console.log(`└───`);
            console.log('\n');

			const spinner = ora('Installing packages...').start();

			const npmInstall = spawn('npm', ['install', '--loglevel=error'], { 
				cwd: sTargetDir, 
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

    async _updatePackageJson(sTargetDir)
	{

		const mimotoJsonPath = path.join(sTargetDir, 'mimoto.config.json');
        const packageJsonPath = path.join(sTargetDir, 'package.json');
        const webpackConfigPath = path.join(sTargetDir, 'webpack.config.js');
        const boilerplateJSPath = path.join(sTargetDir, 'src/js/MimotoProjectBoilerplate.src.js');
        const boilerplateCSSPath = path.join(sTargetDir, 'src/css/MimotoProjectBoilerplate.src.css');
        
        let updatedFiles = [];

        if (await fs.pathExists(mimotoJsonPath)) {
            const mimotoJson = JSON.parse(await fs.readFile(mimotoJsonPath, 'utf8'));
            
            const updatedMimotoJson = {
                name: this.project.name,
                author: this.project.author,
                email: this.project.email,
                ...mimotoJson
            };

            await fs.writeFile(mimotoJsonPath, JSON.stringify(updatedMimotoJson, null, 2));
            updatedFiles.push('mimoto.config.json');
        }

        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            const updatedPackageJson = {
                name: this.project.id,
                displayName: this.project.name,
                author: `${this.project.author} <${this.project.email}>`,
                ...packageJson
            };

            await fs.writeFile(packageJsonPath, JSON.stringify(updatedPackageJson, null, 2));
            updatedFiles.push('package.json');
        }
        
        if (await fs.pathExists(webpackConfigPath)) {
            let webpackConfig = await fs.readFile(webpackConfigPath, 'utf8');

            webpackConfig = webpackConfig.replace(/{{PROJECT_NAME}}/g, this.project.name);
            webpackConfig = webpackConfig.replace(/{{PROJECT_ID}}/g, this.project.name.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(''));
            webpackConfig = webpackConfig.replace(/{{PROJECT_AUTHOR}}/g, this.project.author);
            webpackConfig = webpackConfig.replace(/{{PROJECT_EMAIL}}/g, this.project.email);

            await fs.writeFile(webpackConfigPath, webpackConfig);
            updatedFiles.push('webpack.config.js');
        }

		if (await fs.pathExists(boilerplateJSPath)) {
            let boilerplateJS = await fs.readFile(webpackConfigPath, 'utf8');

            boilerplateJS = boilerplateJS.replace(/{{PROJECT_NAME}}/g, this.project.name);
            boilerplateJS = boilerplateJS.replace(/{{PROJECT_ID}}/g, this.project.name.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(''));
            boilerplateJS = boilerplateJS.replace(/{{PROJECT_AUTHOR}}/g, this.project.author);
            boilerplateJS = boilerplateJS.replace(/{{PROJECT_EMAIL}}/g, this.project.email);

            await fs.writeFile(boilerplateJSPath, boilerplateJS);
			
			const sBoilerplateJSFileName = this.project.name.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('') + '.src.js';

            // Define the new file path
            const newFilePath = path.join(path.dirname(boilerplateJSPath), sBoilerplateJSFileName);

            // Rename the file
            await fs.rename(boilerplateJSPath, newFilePath);

			// Define the path for the copied file
            const targetDir = path.join(sTargetDir, 'public', 'static', 'js');
            const copiedFilePath = path.join(targetDir, path.basename(newFilePath).replace('.src.js', '.js'));

            // Ensure the target directory exists
            await fs.ensureDir(targetDir);

            // Copy the renamed file to the target directory
            await fs.copyFile(newFilePath, copiedFilePath);

            updatedFiles.push(sBoilerplateJSFileName);
        }

		if (await fs.pathExists(boilerplateCSSPath)) {
            let boilerplateCSS = await fs.readFile(webpackConfigPath, 'utf8');

            boilerplateCSS = boilerplateCSS.replace(/{{PROJECT_NAME}}/g, this.project.name);
            boilerplateCSS = boilerplateCSS.replace(/{{PROJECT_ID}}/g, this.project.name.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(''));
            boilerplateCSS = boilerplateCSS.replace(/{{PROJECT_AUTHOR}}/g, this.project.author);
            boilerplateCSS = boilerplateCSS.replace(/{{PROJECT_EMAIL}}/g, this.project.email);

            await fs.writeFile(boilerplateCSSPath, boilerplateCSS);
			
			const sBoilerplateCSSFileName = this.project.name.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('') + '.src.css';

            // Define the new file path
            const newFilePath = path.join(path.dirname(boilerplateCSSPath), sBoilerplateCSSFileName);

            // Rename the file
            await fs.rename(boilerplateCSSPath, newFilePath);

            // Define the path for the copied file
            const targetDir = path.join(sTargetDir, 'public', 'static', 'css');
            const copiedFilePath = path.join(targetDir, path.basename(newFilePath).replace('.src.css', '.css'));

            // Ensure the target directory exists
            await fs.ensureDir(targetDir);

            // Copy the renamed file to the target directory
            await fs.copyFile(newFilePath, copiedFilePath);

            updatedFiles.push(sBoilerplateCSSFileName);
        }


        if (updatedFiles.length > 0) {
            console.log(`┌───`);
            console.log(`│`);
            console.log(`│  🌱 - \x1b[1mMimoto\x1b[0m 💬 - Updated project details in:`);
			console.log(`│`);
            updatedFiles.forEach(file => {
                console.log(`│     - ${file}`);
            });
            console.log(`│`);
            console.log(`└───`);
            console.log('\n');
        }
	}

}

module.exports = InitProject;