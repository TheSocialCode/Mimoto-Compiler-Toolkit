/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import core classes
const chokidar = require("chokidar");
const fs = require('fs');
const path = require('path');
const ora = require('ora');

// import Mimoto util classes
const DataUtils = require("../../toolkit/utils/DataUtils");
const Utils = require("./Utils");


class CombineTemplates
{

	// data
	_config = null;
	_aCoreFiles = [];



	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Constructor
	 */
	constructor()
	{
		// 1. init
		this._init();
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------


	async _init()
	{
		// 1. load
		let config = await Utils.getConfig();

		// 1. validate config file
		if (!config.combine || !config.combine.sources)
		{
			// a. report error
			console.log('🚨 - WARNING - Please add source folders to \u001b[1m\u001B[31mcombine.sources = []\u001B[0m\u001b[22m in mimoto.config.json');

			// b. exit
			process.exit(1);
		}

		// 2. validate config file
		if (!config.combine || !config.combine.output)
		{
			// a. report error
			console.log('🚨 - WARNING - Please set the output file to \u001b[1m\u001B[31mcombine.output = ""\u001B[0m\u001b[22m in mimoto.config.json');

			// b. exit
			process.exit(1);
		}

		// 3. store
		this._config = config;


		// --- load core components


		if (this._config.components && Object.keys(this._config.components).length > 0)
		{
			Object.keys(this._config.components).forEach(sPackageName => {

				this._aCoreFiles = this._loadComponentsInPackage(sPackageName, this._config.components[sPackageName]);

			});
		}


		// --- watch changes


		// 4. init
		let bInitialScanComplete = false;

		// 5. prepare
		const aSourceFolders = [];
		this._config.combine.sources.forEach(folder => aSourceFolders.push(path.join(Utils.getProjectRoot(), folder)));

		// 6. watch file changes
		const watcher = chokidar.watch(aSourceFolders, {
			ignored: /(^|[\/\\])\../, // ignore dotfiles
			persistent: true
		});

		// 7. configure
		watcher.on('ready', () => { bInitialScanComplete = true; this._concatenateHtmlFiles(false); });
		watcher.on('add', path => { if (bInitialScanComplete) { this._concatenateHtmlFiles(true); }});
		watcher.on('change', path => { if (bInitialScanComplete) { this._concatenateHtmlFiles(true); }});
		watcher.on('unlink', path => { if (bInitialScanComplete) { this._concatenateHtmlFiles(true); }});
	}


	/**
	 * Concatenate HTML files
	 * @param bRebuild
	 * @private
	 */
	_concatenateHtmlFiles(bRebuild = false)
	{
		// 1. register
		let start = new Date().getTime();

		// const spinner = ora('Combining HTML files ...').start();


		// 2. output
		console.log('');
		console.log(((bRebuild) ? 'Rebuilding' : 'Building') + ` \u001b[1m\u001b[32m${this._config.combine.output}\u001b[39m\u001b[22m ...`);
		//spinner.text = ((bRebuild) ? 'Rebuilding' : 'Building') + ` \u001b[1m\u001b[32m${this._config.combine.output}\u001b[39m\u001b[22m ...`;




		// 3. init
		let aCombinedHtml = this._aCoreFiles.slice();

		// 4. read
		this._config.combine.sources.forEach(folder => this._readHtmlFiles(path.join(Utils.getProjectRoot(), folder), aCombinedHtml));

		try
		{


			// Ensure the directory exists
			const outputDir = path.dirname(path.join(Utils.getProjectRoot(), this._config.combine.output));

			if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

			// a.
			let sHTML = aCombinedHtml.join('\n');

			const sOutputPath = path.join(Utils.getProjectRoot(), this._config.combine.output);

			// 5. write
			fs.writeFileSync(sOutputPath, sHTML);


			// const dom = new JSDOM(sHTML);
			// const document = dom.window.document;
			//
			// let aInstructions = {};
			//
			// const elements = document.querySelectorAll('*');
			// elements.forEach(el => {
			//     Array.from(el.attributes).forEach(attr => {
			//         if (attr.name.startsWith('data-mimoto-')) {
			//
			//             aInstructions[attr.name] = true;
			//
			//             console.log(`Element: ${el.tagName}, Attribute: ${attr.name}, Value: ${attr.value}`);
			//         }
			//     });
			// });
			//
			// console.log('aInstructions =', aInstructions);


		}
		catch (error)
		{
			// 6. report error
			console.log('\n');
			console.error('🚨 - WARNING - Could not write to output file \u001b[1m\u001B[31m' + this._config.combine.output + '\u001B[0m\u001b[22m');
			console.error('Error details:', error.message);
			process.exit(1);
		}

		// 7. register
		let end = new Date();

		// 8. compose
		const sTimestampDone = end.getFullYear() + '.' + DataUtils.addLeadingZeros(end.getMonth() + 1, 2) + '.' + DataUtils.addLeadingZeros(end.getDate(), 2) + ' ' + DataUtils.addLeadingZeros(end.getHours(), 2) + ':' + DataUtils.addLeadingZeros(end.getMinutes(), 2) + ':' + DataUtils.addLeadingZeros(end.getSeconds(), 2);

		// spinner.stop();


		// 9. output result
		console.log('----------------------------------------------');
		console.log(`🥦 - Compile done in ${end.getTime() - start}ms - \u001b[1m` + sTimestampDone + '\u001b[22m\n');
	}



	/**
	 * Find package root (in order to locate node_modules folder)
	 * @param currentDir
	 * @returns {*|null}
	 */
	_findPackageRoot(currentDir)
	{
		// 1. check if the current directory contains a package.json file, return the path if it does and exit
		if (fs.existsSync(path.join(currentDir, 'package.json'))) return currentDir;

		// 2. get the parent directory
		const parentDir = path.dirname(currentDir);

		// 3. if we've reached the root directory without finding a package.json, return null
		if (currentDir === parentDir) return null;

		// 4. recursively search in the parent directory
		return this._findPackageRoot(parentDir);
	}

	/**
	 * Load components in package
	 */
	_loadComponentsInPackage(sPackageName, components)
	{
		// 1. init
		let aTemplates = [];

		// 2. manage
		try
		{
			// a. find package root
			const packageRoot = this._findPackageRoot(process.cwd());

			// b. validate or report and exit
			if (!packageRoot)
			{
				console.log('NPM package root not found. Unable to find `' + sPackageName + '` in node_modules folder');
				return;
			}

			// c. compose
			const sPackageDirectory = (Utils.isMimotoPackage()) ? path.join(packageRoot, 'components') : path.join(packageRoot, 'node_modules', sPackageName, 'components');

			// d. parse all components
			Object.keys(components).forEach(sComponentName => {

				// I. compose
				let sComponentPath = path.join(sPackageDirectory, components[sComponentName]);

				// II. complete
				sComponentPath = (sComponentPath.indexOf('.html') === -1) ? sComponentPath + '.html' : sComponentPath;

				// III. manage
				try {

					// 1. Check if the HTML file exists
					if (!fs.existsSync(sComponentPath))
					{
						// a. report
						console.log(`HTML file not found: ${sComponentPath}`);

						// b. exit
						process.exit(1);
					}

					// 2. load
					let sHTML = fs.readFileSync(sComponentPath, 'utf8');

					// 3. prepare
					const sInstruction = 'data-mimoto-register';
					const regex = new RegExp(`${sInstruction}="[^"]*"`, 'g');

					// 4. rename component
					sHTML = sHTML.replace(regex, `${sInstruction}="${sComponentName}"`);

					// 5. store
					aTemplates.push(sHTML);

				} catch (err)
				{
					// 1. report
					console.error('Error while loading HTML file:', err);

					// 2. exit
					process.exit(1);
				}
			});

		} catch(error) {

			// a. report error
			console.log('🚨 - WARNING - Node package ' + sPackageName + ' node found');

			// b. exit
			process.exit(1);
		}

		// send
		return aTemplates;
	}

	/**
	 * Recursively read HTML files from a folder
	 * @param sFolder
	 * @param aCombinedHtml
	 */
	_readHtmlFiles(sFolder, aCombinedHtml)
	{
		// 1. read all items in the folder
		fs.readdirSync(sFolder, { withFileTypes: true }).forEach(entry =>
		{
			// a. compose
			const fullPath = path.join(sFolder, entry.name);

			// b. handle folder
			if (entry.isDirectory())
			{
				// If it's a directory, recurse into it
				this._readHtmlFiles(fullPath, aCombinedHtml);
			}
			// c. handle html file
			else if (path.extname(entry.name) === '.html')
			{
				// I. add template to export
				aCombinedHtml.push(fs.readFileSync(fullPath, 'utf8'));
			}
		});
	}

}

module.exports = CombineTemplates;