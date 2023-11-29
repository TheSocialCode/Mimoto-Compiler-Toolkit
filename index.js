/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import core node classes
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// 2. import Mimoto classes
const DataUtils = require('./toolkit/utils/DataUtils');


// --- init


// 3. get root directory
let sRootDir = '';
const args = process.argv.slice(2); // Removes the first two default elements
args.forEach((val, index) => { if (val === '-root') { sRootDir = args[index + 1]; } });
const RUNTIME_ROOT = path.join(process.cwd(), sRootDir);


// console.log('RUNTIME_ROOT =', RUNTIME_ROOT);


// Compiler remove comments


// if name of root folder is 'mimoto' then in 'mimoto' package so adjust packages




/**
 * Load configuration file mimoto.config.json
 */
function loadConfig() {
    try {

        // a. point to the directory where the script is executed, not where it is located
        const configFile = path.join(RUNTIME_ROOT, 'mimoto.config.json');

        // b. send file contents
        return JSON.parse(fs.readFileSync(configFile, 'utf8'));

    } catch(error) {

        // a. report error
        console.log('🚨 - WARNING - Missing config file \u001b[1m\u001B[31mmimoto.config.json\u001B[0m\u001b[22m in project root');

        // b. exit
        process.exit(1);
    }
}


/**
 * Find package root (in order to locate node_modules folder)
 * @param currentDir
 * @returns {*|null}
 */
function findPackageRoot(currentDir)
{
    // 1. check if the current directory contains a package.json file, return the path if it does and exit
    if (require('fs').existsSync(path.join(currentDir, 'package.json'))) return currentDir;

    // 2. get the parent directory
    const parentDir = path.dirname(currentDir);

    // 3. if we've reached the root directory without finding a package.json, return null
    if (currentDir === parentDir) return null;

    // 4. recursively search in the parent directory
    return findPackageRoot(parentDir);
}


// const packageRoot = findPackageRoot(__dirname);

// if (packageRoot) {
//     console.log(`The root directory of the package is: ${packageRoot}`);
// } else {
//     console.log('No package.json found in the directory hierarchy.');
// }




/**
 * Load components in package
 */
function loadComponentsInPackage(sPackageName, components)
{
    // 1. init
    let aTemplates = [];

    // 2. manage
    try {

        // a. find package root
        const packageRoot = findPackageRoot(__dirname);

        // b. validate or report and exit
        if (!packageRoot)
        {
            console.log('Package root not found. Unable to reach node_modules folder. for adding component', sComponentName, 'in', sPackageName);
            return;
        }

        // c. compose
        const sPackageDirectory = path.join(packageRoot, 'node_modules', sPackageName);

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



// 2. load
const config = loadConfig();

// 3. validate config file
if (!config.combine || !config.combine.sources)
{
    // a. report error
    console.log('🚨 - WARNING - Please add source folders to \u001b[1m\u001B[31mcombine.sources = []\u001B[0m\u001b[22m in mimoto.config.json');

    // b. exit
    process.exit(1);
}

// 4. validate config file
if (!config.combine || !config.combine.output)
{
    // a. report error
    console.log('🚨 - WARNING - Please set the output file to \u001b[1m\u001B[31mcombine.output = ""\u001B[0m\u001b[22m in mimoto.config.json');

    // b. exit
    process.exit(1);
}


if (config.mimoto && config.mimoto.target)
{
    // console.log('config.mimoto =', config.mimoto);

    // check target

    // Path to your JavaScript file
    const filePath = path.join(__dirname, 'bin/thesocialcode/mimoto/Mimoto.min.js');

// Read the file content
    fs.readFile(filePath, 'utf8', function(err, data)
    {
        if (err) {
            console.error(err);
            return;
        }


        // // List of class names to replace
        // const classesToReplace = ['MimotoInputInstruction'];
        //
        // // Replace each class with an empty string or dummy class
        let updatedContent = data;
        // classesToReplace.forEach(className => {
        //     const regexPattern = new RegExp(`class\\s+${className}\\s*{[\\s\\S]*?}`, 'g');
        //     updatedContent = updatedContent.replace(regexPattern, '');
        // });



        let sTargetFilePath = path.join(RUNTIME_ROOT, config.mimoto.target, 'Mimoto.js')

        // Extract the directory path from the file path
        const sDirPath = path.dirname(sTargetFilePath);

        // Create the directory if it doesn't exist
        if (!fs.existsSync(sDirPath)) fs.mkdirSync(sDirPath, { recursive: true });



        // Write the updated content back to the file or a new file
        // fs.writeFile(path.join(RUNTIME_ROOT, '../bin/thesocialcode/mimoto/Mimoto.min.X.js'), updatedContent, 'utf8', function(err) {
        fs.writeFile(sTargetFilePath, updatedContent, 'utf8', function(err) {
            if (err) return console.error(err);
            console.log('✨ - Mimoto.js has been added to the project!\n');
        });
    });
}



let aCoreFiles = [];

if (config.components && Object.keys(config.components).length > 0)
{
    Object.keys(config.components).forEach(sPackageName => {

        aCoreFiles = loadComponentsInPackage(sPackageName, config.components[sPackageName]);

    });
}












/**
 * Recursively read HTML files from a folder
 * @param sFolder
 * @param aCombinedHtml
 */
function readHtmlFiles(sFolder, aCombinedHtml) {
    fs.readdirSync(sFolder, { withFileTypes: true }).forEach(entry => {
        const fullPath = path.join(sFolder, entry.name);
        if (entry.isDirectory()) {
            // If it's a directory, recurse into it
            readHtmlFiles(fullPath, aCombinedHtml);
        } else if (path.extname(entry.name) === '.html') {
            // If it's an HTML file, add its contents
            aCombinedHtml.push(fs.readFileSync(fullPath, 'utf8'));
        }
    });
}


/**
 * Concatenate HTML files
 * @param bRebuild
 */
function concatenateHtmlFiles(bRebuild = false)
{
    // 1. register
    let start = new Date().getTime();

    // 2. output
    console.log('');
    console.log(((bRebuild) ? 'Rebuilding' : 'Building') + ` \u001b[1m\u001b[32m${config.combine.output}\u001b[39m\u001b[22m ...`);

    // 3. init
    let aCombinedHtml = aCoreFiles.slice();

    // 4. read
    config.combine.sources.forEach(folder => readHtmlFiles(path.join(RUNTIME_ROOT, folder), aCombinedHtml));

    try
    {
        let sHTML = aCombinedHtml.join('\n')


        // 5. write
        fs.writeFileSync(path.join(RUNTIME_ROOT, config.combine.output), sHTML);






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
        console.log('🚨 - WARNING - Could not write to output file \u001b[1m\u001B[31m' + config.combine.output + '\u001B[0m\u001b[22m');
        process.exit(1);
    }

    // 7. register
    let end = new Date();

    // 8. compose
    const sTimestampDone = end.getFullYear() + '.' + DataUtils.addLeadingZeros(end.getMonth() + 1, 2) + '.' + DataUtils.addLeadingZeros(end.getDate(), 2) + ' ' + DataUtils.addLeadingZeros(end.getHours(), 2) + ':' + DataUtils.addLeadingZeros(end.getMinutes(), 2) + ':' + DataUtils.addLeadingZeros(end.getSeconds(), 2);

    // 9. output result
    console.log('----------------------------------------------');
    console.log(`🥦 - Compile done in ${end.getTime() - start}ms - \u001b[1m` + sTimestampDone + '\u001b[22m\n');
}

// 5. init
let bInitialBuild = true;

// 6. watch file changes
chokidar.watch(config.combine.sources, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
}).on('all', (event, path) => {
    //console.log(`File ${path} has been ${event}`);
    if (!bInitialBuild) concatenateHtmlFiles(true);
});

// 7. initial build (with delay to allow for initial watch function to finish)
setTimeout(() => {

    // a. toggle
    bInitialBuild = false;

    // b. initial build
    concatenateHtmlFiles();

}, 10);

// 8. export
module.exports = { concatenateHtmlFiles };