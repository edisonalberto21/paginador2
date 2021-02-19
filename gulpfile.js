'use strict';

const gulp = require('gulp');
const build = require('@microsoft/sp-build-web');

const webpack = require('webpack');
const path = require('path');
const logging = require('@microsoft/gulp-core-build');
const fs = require('fs');
const uuidV4 = require('uuid/v4');
const chalk = require('chalk');
const decomment = require('decomment');
const packageFilePath = './config/package-solution.json';
const cdnFilePath = './config/write-manifests.json';
const configFilePath = './config/config.json';
const settingsFilePath = './config/package-solution-env-settings.json';

build.configureWebpack.mergeConfig({
    additionalConfiguration: (generatedConfiguration) => {
        generatedConfiguration.plugins.push(new webpack.ContextReplacementPlugin(/\@angular(\\|\/)core(\\|\/)fesm5/, path.join(__dirname, './client')));
        generatedConfiguration.module.rules.push(
            {
                test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: {
                    loader: 'url-loader'
                }
            }
        );
        return generatedConfiguration;
    }
});

//Cambiar configuraciones para los 3 ambientes: Desarrollo, pruebas y producción
/*
Instrucciones:

1. Para cambiar las configuraciones para el ambiente de desarrollo:

    1.1 Checkear primero: gulp change-pkg-settings --check
    1.2 Lanzar el cambio de configuración: 
          gulp change-pkg-settings --checkgulp change-pkg-settings --env dev 
    
2. Para cambiar las configuraciones para el ambiente de pruebas:

    1.1 Checkear primero: gulp change-pkg-settings --check
    1.2 Lanzar el cambio de configuración: 
          gulp change-pkg-settings --checkgulp change-pkg-settings --env uat

3. Para cambiar las configuraciones para el ambiente de producción:

    1.1 Checkear primero: gulp change-pkg-settings --check
    1.2 Lanzar el cambio de configuración: 
          gulp change-pkg-settings --checkgulp change-pkg-settings
*/
build.task('change-pkg-settings', {
    execute: (config) => {
        return new Promise((resolve, reject) => {
            /* Retrieve the arguments */
            const env = config.args['env'] || "default";
            const check = config.args['check'] || false;
            const cdn = config.args['cdnpath'] || "";

            /* Check if the user wants to log the environment information */
            if (check) {
                // Start the environment logging
                environmentLogging();
                // Complete the task
                resolve();
                return;
            }

            /* Start processing the package changes */
            // Retrieve the package solution file
            let pkgSolJSON = JSON.parse(fs.readFileSync(packageFilePath));
            // Retrieve the CDN manifest file
            let cdnJSON = JSON.parse(fs.readFileSync(cdnFilePath));
            // Retrieve the config file
            const configJSON = JSON.parse(fs.readFileSync(configFilePath));

            // Get the package settings - only available if you already used this task
            let pkgSettingsJSON = {
                environments: []
            };
            // Retrieve the environment information from the settings file if it exists
            if (fs.existsSync(settingsFilePath)) {
                const contents = fs.readFileSync(settingsFilePath);
                if (contents.length > 0) {
                    pkgSettingsJSON = JSON.parse(contents);
                }
            }
            // Check for environment information
            if (pkgSettingsJSON.environments.length === 0) {
                // Get all the developer entries (web parts and extensions)
                const devEntries = getDevEntries(configJSON);
                // Store the current settings as the default
                storeEnvironmentSettings(pkgSettingsJSON, pkgSolJSON, cdnJSON.cdnBasePath, devEntries, 'default');
            }

            // Retrieve of create the environment information
            logging.log(`Configuraciones par el ambiente: ${env}`);
            const cdnPath = cdn === "" ? cdnJSON.cdnBasePath : cdn;
            const crntEnv = getEnvironmentInfo(pkgSettingsJSON, pkgSolJSON, cdnPath, env);
            pkgSolJSON.solution.name = crntEnv.name;
            pkgSolJSON.solution.id = crntEnv.id;
            pkgSolJSON.paths.zippedPackage = crntEnv.zip;

            // pkgSolJSON.solution.features.title = crntEnv.name;
            // pkgSolJSON.solution.features.description = crntEnv.name;
            // pkgSolJSON.solution.features[0].id = crntEnv.featureId;

            // Check if the developer entries are retrieved, otherwise new IDs have to be generated
            if (typeof crntEnv.entries === "undefined") {
                crntEnv.entries = [];
            }
            // Go over all the bundles
            for (const bundleName in configJSON.bundles) {
                const bundle = configJSON.bundles[bundleName];
                // Go over every component in the bundles
                if (typeof bundle.components !== "undefined") {
                    bundle.components.forEach(component => {
                        const crntEntry = crntEnv.entries.filter(e => e.location === component.manifest);
                        // Check if the entry existed
                        if (crntEntry.length === 0) {
                            crntEnv.entries.push({
                                id: crntEntry.id = uuidV4(),
                                location: component.manifest
                            });
                        }
                    });
                }
            }

            // Update the CDN path to the current environment
            crntEnv.cdn = cdn === "" ? crntEnv.cdn : cdn;
            cdnJSON.cdnBasePath = crntEnv.cdn;
            logging.log(`Usando la siguiente ruta de CDN: ${crntEnv.cdn}`);

            // Store the settings
            logging.log(`Escribiendo configuraciones al archivo de ambientes: ${settingsFilePath}`);
            storeEnvironmentSettings(pkgSettingsJSON, pkgSolJSON, crntEnv.cdn, crntEnv.entries, env);
            // Write the package information to the JSON file
            logging.log(`Actualizando archivo de paquete de solución: ${packageFilePath}`);
            fs.writeFileSync(packageFilePath, JSON.stringify(pkgSolJSON, null, 2));
            // Write the CDN path to the manifest file
            logging.log(`Actualizando archivo manifest del CDN: ${cdnFilePath}`);
            fs.writeFileSync(cdnFilePath, JSON.stringify(cdnJSON, null, 2));
            // Update all the IDs in the manifest files
            crntEnv.entries.forEach(entry => {
                const manifestContent = fs.readFileSync(entry.location, 'utf8');
                const manifestJSON = JSON.parse(decomment(manifestContent));
                if (manifestJSON.id !== entry.id) {
                    logging.log(`Actualizando el ID en el manifest: ${entry.location}`);
                    logging.log(chalk.green(`Versión actual: ${manifestJSON.id} - Versión nueva: ${entry.id}`));
                    manifestJSON.id = entry.id;
                    fs.writeFileSync(entry.location, JSON.stringify(manifestJSON, null, 2));
                }
            });
            resolve();
        });
    }
});
/**
 * Log the current stored environment information
 */
function environmentLogging() {
    if (fs.existsSync(settingsFilePath)) {
        const settingContents = fs.readFileSync(settingsFilePath);
        const pkgSolJSON = JSON.parse(fs.readFileSync(packageFilePath));

        if (settingContents.length > 0) {
            const settings = JSON.parse(settingContents);
            if (settings.environments.length > 0) {
                logging.log('Se encontró la siguiente información de ambientes:');
                settings.environments.forEach((environment) => {
                    logging.log(`- ${environment.environment}: ${environment.id} ${pkgSolJSON.solution.id === environment.id ? chalk.green.bold('(current)') : ''}`);
                    logging.log(`  ${environment.cdn}`);
                });
            } else {
                // File exists, but no information is stored
                logging.warn('No se encontró información del archivo del ambiente!');
            }
        } else {
            // File exists, but no information is stored
            logging.warn('Archivo de ambientes vacío');
        }
    } else {
        // No environment file is found
        logging.error('No se encontró información del archivo del ambiente!');
    }
}


/**
 * Function which returns the environment information for the specified environment
 *
 * @param {*} settingsJSON
 * @param {*} solutionJSON
 * @param {string} cdnPath
 * @param {string} env
 */
function getEnvironmentInfo(settingsJSON, solutionJSON, cdnPath, env) {
    // Check if the environment information exists
    const solutionInfo = getEnvironment(settingsJSON, env);
    if (solutionInfo !== null) {
        return solutionInfo;
    }

    // Get the default environment information
    const defaultInfo = getEnvironment(settingsJSON, 'default');
    let solution;
    if (defaultInfo !== null) {
        const zipPkg = defaultInfo.zip.split('.sppkg');
        solution = {
            id: uuidV4(),
            name: `${defaultInfo.name}-${env}`,
            zip: `${zipPkg[0]}-${env}.sppkg`,
            cdn: defaultInfo.cdn,
            featureId: uuidV4(),
            entries: []
        };
    } else {
        const zipPkg = solutionJSON.paths.zippedPackage.split('.sppkg');
        solution = {
            id: uuidV4(),
            name: `${solutionJSON.solution.name}-${env}`,
            zip: `${zipPkg[0]}-${env}.sppkg`,
            cdn: cdnPath,
            featureId: uuidV4(),
            entries: []
        };
    }
    logging.log('featureId: ' + solution.featureId);
    return solution;
}


/**
 * Function to get the environment information
 *
 * @param {*} settingsJSON
 * @param {string} env
 */
function getEnvironment(settingsJSON, env) {
    for (let i = 0; i < settingsJSON.environments.length; i++) {
        let crntEnv = settingsJSON.environments[i];
        if (crntEnv.environment === env) {
            return crntEnv;
        }
    }
    return null;
}


/**
 * Function that will store the environment information to a seperate JSON file
 *
 * @param {*} settingsJSON
 * @param {*} solutionJSON
 * @param {string} cdnPath
 * @param {*} devEntries
 * @param {string} env
 */
function storeEnvironmentSettings(settingsJSON, solutionJSON, cdnPath, devEntries, env) {
    let found = false;

    // Loop and update the environment record
    for (let i = 0; i < settingsJSON.environments.length; i++) {
        let crntEnv = settingsJSON.environments[i];
        if (crntEnv.environment === env) {
            crntEnv.id = solutionJSON.solution.id;
            crntEnv.name = solutionJSON.solution.name;
            crntEnv.zip = solutionJSON.paths.zippedPackage;
            // crntEnv.featureId = solutionJSON.solution.features[0].id;
            crntEnv.cdn = cdnPath;
            crntEnv.entries = devEntries;
            found = true;
        }
    }

    // If the current environment was not find, we will add it
    if (!found) {
        settingsJSON.environments.push({
            environment: env,
            id: solutionJSON.solution.id,
            name: solutionJSON.solution.name,
            zip: solutionJSON.paths.zippedPackage,
            cdn: cdnPath,
            // featureId: solutionJSON.solution.features.id,
            entries: devEntries
        });
    }

    fs.writeFileSync(settingsFilePath, JSON.stringify(settingsJSON, null, 2))
}


/**
 * Function to retrieve all developer manifests of your webparts and extensions
 *
 * @param {*} configJSON
 */
function getDevEntries(configJSON) {
    let entries = [];

    if (configJSON.bundles) {
        logging.log(`Se encontró la siguiente información de entradas de desarrollo:`);

        for (const bundleName in configJSON.bundles) {
            const bundle = configJSON.bundles[bundleName];
            if (typeof bundle.components !== "undefined") {
                // Loop over all the component manifests
                bundle.components.forEach(component => {
                    // Check if the manifest property exist
                    if (typeof component.manifest !== "undefined") {
                        // Check if the manifest file exists
                        if (fs.existsSync(component.manifest)) {
                            const manifestCnts = fs.readFileSync(component.manifest, 'utf8');
                            if (manifestCnts.length > 0) {
                                const manifest = JSON.parse(decomment(manifestCnts));
                                logging.log(`- ${manifest.id}`);
                                entries.push({
                                    id: manifest.id,
                                    location: component.manifest
                                });
                            }
                        }
                    }
                });
            }
        }
    }

    return entries;
}

build.initialize(gulp);