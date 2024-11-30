/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const Utils = require('./Utils');


class InstallComponents {
    constructor(targetDir) {
        this.targetDir = targetDir;
        this.componentsPath = path.join(process.cwd(), 'components');
        this.components = this.getComponents();
    }

    async getComponents() {
        const components = [];
        const configPath = path.join(this.targetDir, 'mimoto.config.json');
        let config;

        // Read existing config
        try {
            config = await fs.readJson(configPath);
        } catch (error) {
            config = { components: { mimoto: {} } };
        }

        const installedComponents = config.components?.mimoto || {};

        const readComponentsRecursively = (dir, prefix = '') => {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const relativePath = path.join(prefix, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    readComponentsRecursively(fullPath, relativePath);
                } else if (path.extname(item).toLowerCase() === '.html') {
                    const componentName = path.basename(item, '.html');
                    const componentPath = path.dirname(relativePath);
                    const relativePathFormatted = relativePath.replace(/\\/g, '/');
                    const isInstalled = Object.values(installedComponents).includes(relativePathFormatted);
                    components.push({ 
                        name: `${componentName} (${componentPath})`, 
                        value: fullPath,
                        checked: isInstalled
                    });
                }
            });
        };
        readComponentsRecursively(this.componentsPath);
        return components;
    }

    async install() {
        const inquirer = await Utils.getInquirer();

        console.log(`│`);
        console.log(`│   Component Installation`);
        console.log(`│`);

        if (this.components.length === 0) {
            console.log('No components found in the /components folder.');
            return;
        }

        try {
            const { selectedComponents } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedComponents',
                    message: 'Select the components you want to install:',
                    choices: this.components,
                    pageSize: 10
                }
            ]);

            if (selectedComponents.length > 0) {
                console.log('┌───');
                console.log('│');
                console.log('│   Installing selected components...');
                console.log('│');
                console.log('└───');
                console.log('\n');

                await this.initializeComponents(selectedComponents);
            } else {
                console.log('No components selected for installation.');
            }
        } catch (error) {
            if (error.name === 'ExitPromptError') {
                console.log('\nComponent installation cancelled.');
            } else {
                console.error('An error occurred during component installation:', error);
            }
        } finally {
            console.log(`│`);
        }
        
        console.log(`│`);
    }

    async initializeComponents(components) {
        const configPath = path.join(this.targetDir, 'mimoto.config.json');
        let config;

        // Read existing config or create a new one
        try {
            config = await fs.readJson(configPath);
        } catch (error) {
            config = {};
        }

        // Ensure config.components and config.components.mimoto exist
        if (!config.components) {
            config.components = {};
        }
        if (!config.components.mimoto) {
            config.components.mimoto = {};
        }

        // Get all available components
        const allComponents = await this.getComponents();
        
        // Create a set of selected component basenames
        const selectedBasenames = new Set(components.map(c => path.basename(c, '.html')));

        // Process all available components
        for (const component of allComponents) {
            const relativePath = path.relative(this.componentsPath, component.value);
            const basename = path.basename(component.value, '.html');

            if (selectedBasenames.has(basename)) {
                // Add or update the selected component
                // console.log(`Registering component: ${basename}`);
                config.components.mimoto[basename] = relativePath.replace(/\\/g, '/');
            } else if (config.components.mimoto[basename]) {
                // Remove the component if it was previously installed but not currently selected
                // console.log(`Removing component: ${basename}`);
                delete config.components.mimoto[basename];
            }
        }

        // console.log('config =', config);

        // Write updated config back to file
        const jsonString = JSON.stringify(config, null, '\t');
        await fs.writeFile(configPath, jsonString, 'utf8');

        // II. report
        console.log(`┌───`);
        console.log(`│`);
        console.log(`│   🌱 - \x1b[1mMimoto\x1b[0m 💬 - mimoto.config.json has been updated with the selected components.`);
        console.log(`│`);
        console.log(`└───`);

    }
}

module.exports = InstallComponents;
