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
const MimotoFirebaseUtils = require('@thesocialcode/mimoto-firebase-toolkit/utils/DataUtils');


// --- init


// 3. get root directory
let sRootDir = '';
const args = process.argv.slice(2); // Removes the first two default elements
args.forEach((val, index) => { if (val === '-root') { sRootDir = args[index + 1]; } });
const RUNTIME_ROOT = path.join(process.cwd(), sRootDir);


// console.log('RUNTIME_ROOT =', RUNTIME_ROOT);



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
 * Load component
 */
function loadComponent(sPackageName, sComponentName)
{
    console.log('');
    console.log('🐰 - sPackageName =', sPackageName);

    try {


        // check if dirname of root of project is 'mimoto', otherwise in DEV mode so load 'mimoto' package locally

        const sPackagedirectory = path.join(RUNTIME_ROOT, '/node_modules/' + sPackageName);

        console.log('Package dir = ', sPackagedirectory);



// Replace this with the actual directory path
//         const directoryPath = 'path/to/your/directory';

        // const parentDirectory = path.dirname(directoryPath);
        // const isNodeModules = path.basename(parentDirectory) === 'node_modules';
        // const isNodeModules = parentDirectory === __dirname;

        // console.log(isNodeModules ? 'Parent directory is node_modules' : 'Parent directory is not node_modules');




        if (fs.existsSync(sPackagedirectory))
        {
            console.log('Folder exists.');
        } else {
            console.log('Folder does not exist.');
        }


        // a. point to the directory where the script is executed, not where it is located
        // const configFile = path.join(process.cwd(), 'mimoto.config.json');

        // b. send file contents
        // return JSON.parse(fs.readFileSync(configFile, 'utf8'));

    } catch(error) {

        // a. report error
        console.log('🚨 - WARNING - Node package node found');

        // b. exit
        process.exit(1);
    }
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



// if (config.components && Object.keys(config.components).length > 0)
// {
//     Object.keys(config.components).forEach(sPackageName => {
//
//         loadComponent(sPackageName, config.components[sPackageName]);
//
//     });
// }












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
    let combinedHtml = [];

    // 4. read
    config.combine.sources.forEach(folder => readHtmlFiles(path.join(RUNTIME_ROOT, folder), combinedHtml));

    try
    {
        let sHTML = combinedHtml.join('\n')


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
    const sTimestampDone = end.getFullYear() + '.' + MimotoFirebaseUtils.addLeadingZeros(end.getMonth() + 1, 2) + '.' + MimotoFirebaseUtils.addLeadingZeros(end.getDate(), 2) + ' ' + MimotoFirebaseUtils.addLeadingZeros(end.getHours(), 2) + ':' + MimotoFirebaseUtils.addLeadingZeros(end.getMinutes(), 2) + ':' + MimotoFirebaseUtils.addLeadingZeros(end.getSeconds(), 2);

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