/**
 * Mimoto Compiler Toolkit - A tiny helper for building Mimoto projects
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import core node classes
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');

// import Mimoto classes
const Utils = require('./Utils');


class InstallComponents
{


    // ----------------------------------------------------------------------------
    // --- Constructor ------------------------------------------------------------
    // ----------------------------------------------------------------------------


    constructor()
    {
        // Set the componentsPath relative to the package root
        this.componentsPath = path.join(Utils.getMimotoRoot(), 'components');
        this.components = this.getComponents();
    }

    async getComponents()
    {
        // 1. load
        let config = await Utils.getConfig();

        // 2. init
        const components = [];

        // 3. read
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

    async install()
    {
        // 1. prepare
        const inquirer = await Utils.getInquirer();

        // 2. validate
        if (this.components.length === 0)
        {
            // 1. report
            Utils.report('No components found in the /components folder.', true);

            // b. exit
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

            if (selectedComponents.length > 0)
            {
                Utils.report('Installing selected components...');

                await this.initializeComponents(selectedComponents);
            }
            else
            {
                Utils.report('No components selected for installation.');
            }
        }
        catch (error)
        {
            Utils.handleError(error, 'Error during component installation');

        }
    }

    /**
     * Initialize components
     * @param components
     * @returns {Promise<void>}
     */
    async initializeComponents(components)
    {
        // 1. load
        let config = await Utils.getConfig();

        // 2. prepare
        if (!config.components) config.components = {};
        if (!config.components.mimoto) config.components.mimoto = {};

        // 3. get all available components
        const allComponents = await this.getComponents();
        
        // 4. create a set of selected component basenames
        const selectedBasenames = new Set(components.map(c => path.basename(c, '.html')));

        // 5. process all available components
        for (const component of allComponents)
        {
            // a. prepare
            const relativePath = path.relative(this.componentsPath, component.value);
            const basename = path.basename(component.value, '.html');

            // b. check if component falls into the group
            if (selectedBasenames.has(basename))
            {
                // I. add or update the selected component
                config.components.mimoto[basename] = relativePath.replace(/\\/g, '/');
            }
            else if (config.components.mimoto[basename])
            {
                // I. remove the component if it was previously installed but not currently selected
                delete config.components.mimoto[basename];
            }
        }

        // 6. write updated config back to file
        const jsonString = JSON.stringify(config, null, '\t');
        await fs.writeFile(path.join(Utils.getProjectRoot(),'mimoto.config.json'), jsonString, 'utf8');

        // 7. report
        Utils.report('mimoto.config.json has been updated with the selected components.');

    }
}

module.exports = InstallComponents;
