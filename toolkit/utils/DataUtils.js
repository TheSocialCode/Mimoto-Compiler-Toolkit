/**
 * Mimoto Firebase Toolkit - Utils - A collection of common data manipulation functions
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import NodeJS classes
const fs = require('fs');


function removeUndefinedProperties(obj)
{
	for (let prop in obj)
	{
		if (obj.hasOwnProperty(prop) && obj[prop] === undefined) delete obj[prop];

		if (typeof obj[prop] === 'object') removeUndefinedProperties(obj[prop]);
	}

	return obj;
}

function addLeadingZeros(num, size) {
	num = num.toString();
	while (num.length < size) num = "0" + num;
	return num;
}


/**
 * Load template and inject data
 * @param sPathToTemplate
 * @param data
 * @param sOpeningTag
 * @param sClosingTag
 * @returns {Promise<unknown>}
 */
async function useTemplate(sPathToTemplate, data, sOpeningTag = '{{', sClosingTag = '}}')
{
	return new Promise(async (resolve, reject) => {
		// 1.  convert data to deep vars
		let aDeepValues = collectDeepValues(data);

		// 2. load template
		let sTemplate = await readFile(sPathToTemplate);

		// 3. inject vars into templates and send
		resolve(replaceVars(sTemplate, aDeepValues, sOpeningTag, sClosingTag));
	});
}

/**
 * Read a file and return its content
 * @param sPath
 * @returns {Promise<unknown>}
 * @private
 */
function readFile(sPath)
{
	return new Promise((resolve, reject) => {

		// 1. load
		fs.readFile(sPath, 'utf8', (err, data) => {

			// a. validate or report error
			if (err) { reject(err); return; }

			// b. send
			resolve(data);

		});
	});
}

/**
 * Convert data to deep vars
 * @param data
 * @param aVars
 * @param sPrefix
 * @returns {{}}
 * @private
 */
function collectDeepValues(data, aVars = {}, sPrefix = '')
{
	// 1. validate or return empty but uasable result
	if (typeof data !== 'object') return {};

	// 2. extract
	for (let sKey in data)
	{
		if (typeof data[sKey] === 'object')
		{
			collectDeepValues(data[sKey],aVars, (sPrefix) ? sPrefix + '.' + sKey : sKey);
		}
		else
		{
			aVars[(sPrefix) ? sPrefix + '.' + sKey : sKey] = data[sKey];
		}
	}

	return aVars;
}

/**
 * Replace vars in text
 * @param sText
 * @param aDeepValues
 * @param sOpeningTag
 * @param sClosingTag
 * @returns {*}
 * @private
 */
function replaceVars(sText, aDeepValues, sOpeningTag = '{{', sClosingTag = '}}')
{
	// 1. init
	let vars = {}

	// 2. compose
	let regExp = new RegExp(sOpeningTag + '(.*?)' + sClosingTag, 'gi');

	// 3. load vars
	let aMatches = sText.match(regExp);

	// 4. return original text if no vars found
	if (!aMatches) return sText;

	// 5. convert
	aMatches.forEach((sIdentifier, nIndex) => vars[sIdentifier] = sIdentifier.substring(2, sIdentifier.length - 2).trim());

	// 6. replace
	for (let sIdentifier in vars) sText = sText.replaceAll(sIdentifier, aDeepValues[vars[sIdentifier]]);

	// 7. send
	return sText;
}

/**
 * Clone object
 * @param objectToClone
 * @returns {any}
 */
function clone(objectToClone)
{
	// 1. verify or default
	if (!isObject(objectToClone) && !Array.isArray(objectToClone)) return objectToClone;

	// 2. clone array and send
	if (Array.isArray(objectToClone))
	{
		// a. init
		let aClonedArray = [];

		// b. copy and clone
		objectToClone.forEach(value => aClonedArray.push(clone(value)));

		// c. send
		return aClonedArray;
	}

	// 3. duplicate and send
	return JSON.parse(JSON.stringify(objectToClone));
}

function isObject(variableToVerify)
{
	// 1. verify and report
	return (variableToVerify && typeof variableToVerify === 'object' && !Array.isArray(variableToVerify));
}

/**
 * Deep merge the objectToMerge into objectToMergeInto with objectToMerge's values being dominant
 * @param objectToMergeInto primaryObject
 * @param objectToMerge secondaryObject
 * @returns the merge result as a new object
 */
function mergeDeep(objectToMergeInto, objectToMerge)
{
	// 1. init
	let mergedObject = {};

	// 2. validate
	if (isObject(objectToMergeInto) && isObject(objectToMerge))
	{
		// a. parse all keys
		for (let sKey in objectToMerge)
		{
			// I. verify
			if (objectToMergeInto[sKey] === undefined || isObject(objectToMerge[sKey]) && Object.keys(objectToMerge[sKey]).length === 0)
			{
				// 1. store
				mergedObject[sKey] = objectToMerge[sKey];

				// 2. next
				continue;
			}

			// II. verify
			if (isObject(objectToMergeInto[sKey]))
			{
				// 1. merge and store
				mergedObject[sKey] = mergeDeep(objectToMergeInto[sKey], objectToMerge[sKey]);

				// 2. next
				continue;
			}

			// III. store
			mergedObject[sKey] = objectToMerge[sKey];
		}

		// b. copy remaining properties
		for (let sKey in objectToMergeInto)
		{
			if (mergedObject[sKey] === undefined) mergedObject[sKey] = objectToMergeInto[sKey];
		}
	}
	else
	{
		// a. store
		// if (objectToMergeInto && !objectToMerge) mergedObject = objectToMergeInto;
		// if (!objectToMergeInto && objectToMerge) mergedObject = objectToMerge;
		mergedObject = (isEmpty(objectToMergeInto)) ? objectToMerge : objectToMergeInto;
		// mergedObject = objectToMerge;
	}

	// 3. send
	return mergedObject;
}

/**
 * Check if all values are empty
 * @param value
 * @returns boolean Returns true if ALL values are empty
 */
function isEmpty(value = undefined)
{
	// 1. init
	let aResults = [];

	// 2. check all passed values
	for (const argument of arguments)
	{
		// a. init
		let bSubResult = false;

		// b. validate general
		if (argument === null || argument === undefined || argument === '') bSubResult = true

		// c. validate string
		else if (typeof(argument) === 'string' && argument === '') bSubResult = true;

		// d. validate arrays
		else if (Array.isArray(argument) || argument.length === 0) bSubResult = true;

		// e. validate objects
		else if (typeof(argument) === 'object') bSubResult = (argument && Object.keys(argument).length === 0 && Object.getPrototypeOf(argument) === Object.prototype);

		// f. store
		aResults.push(bSubResult)
	}

	// 3. default
	return aResults.every(bResult => bResult === true);
}


module.exports = {
	removeUndefinedProperties,
	addLeadingZeros,
	useTemplate,
	readFile,
	collectDeepValues,
	replaceVars,
	clone,              // move to MimotoToolkit
	isObject,           // move to MimotoToolkit
	mergeDeep,          // move to MimotoToolkit
	isEmpty             // move to MimotoToolkit
};