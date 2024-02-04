/**
 * Mimoto Firebase Toolkit - Custom claims - A tiny toolset to help managing user permissions
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import Mimoto classes
const DataUtils = require('../../../utils/DataUtils');



// ----------------------------------------------------------------------------
// --- How to use -------------------------------------------------------------
// ----------------------------------------------------------------------------


/**

Here's how to use this toolset:
To manage user claim in your project, add the following code to your Firebase functions index.js:

// 1. import firebase classes
const admin = require('firebase-admin')
const functions = require('firebase-functions');

// 2. import firebase classes
const CustomClaims = require('mimoto/toolkit/firebase/users/customclaims/CustomClaims');

// 3. prepare
const sRegion = 'YOUR_REGION'; // your Firebase functions region, for instance 'europe-west3', default = 'us-central1'

// 4. init
// const customClaims = new CustomClaims(admin, functions, sRegion, config);

// 5. configure
exports.onCreateUser = customClaims.setSpecialClaims();
exports.onUpdateUser = customClaims.setDataClaims();

The config object is a JSON object containing the following properties:

{
    claims: {
        special: {                                      // this could also be an array of similar objects if you want to set special permissions for multiple users
            email: 'YOUREMAIL@DOMAIN',                  // the email address of the user getting special permissions
            customUserClaims: {                         // an object containing the custom claims you want to set for this user
                owner: true,                            // example
                permissions: {}                         // example
            }
        },
        data: {
            userPath: 'team',                           // example, the path to the realtime database node containing the user data
            userCustomClaimsProperty: 'permissions',    // example, the path to the custom claims object in the user's data
            userCustomClaimsKey: 'permissions',         // example, the key to the custom claims object in the user object
            userReset: {                                // node containing actions on what to do when the user is removed
                owner: undefined,                       // example
                permissions: undefined                  // example
            }
        }
    }
}

*/


class CustomClaims
{

    // utils
	_admin = null;
	_functions = null;
	_realtimeDatabase = null;

    // data
	_sRegion = null;
	_config = null;


    /**
     * Constructor
     * @param admin
     * @param functions
     * @param sRegion
     * @param config
     */
	constructor(admin, functions, sRegion, config)
	{
		// 1. store
		this._admin = admin;
		this._functions = functions;
		this._realtimeDatabase = admin.database();
		this._sRegion = sRegion || 'us-central1';
		this._config = config;

		console.log(this._config);

        // 2. validate config object
        if (!this._config || typeof this._config !== 'object' || typeof this._config['claims'] !== 'object' || typeof this._config['claims']['users'] !== 'object')
        {
            // a. report
            console.log('🚨 - WARNING - Please provide a valid config object')

            // b. exit
            return;
        }

        // 3. validate config object's data property
        if (!this._config['claims']['groups']['query'] || !this._config['claims']['data']['userCustomClaimsProperty']  || !this._config['claims']['data']['userCustomClaimsKey'])
        {
            // a. report
            console.log('🚨 - WARNING - Please add claims.groups.query, userCustomClaimsProperty, and userCustomClaimsKey to the config object')

            // b. exit
            return;
        }
	}



	// ----------------------------------------------------------------------------
	// --- Public methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


    /**
     * Set user's special custom claims
     * @returns Firebase function event listener
     */
    onCreateUser()
	{
        // 1. validate
        if (typeof this._config?.claims?.users?.super !== 'object')
        {
            // a. report
            console.log('🚨 - WARNING - Please provide a valid config object')

            // b. exit
            return;
        }

        // 2. set and return listener
		return this._functions.region(this._sRegion).auth.user().onCreate(async (user) => {

			// a. set superuser permissions
			await this._setSuperuserCustomClaims(user);

			// b. set custom claims for new user based on items in database
			await this._setAllUsersCustomClaims(user);

            // c. end
            return null;
		});
	}

    /**
     * Set user custom claims based on data
     * @returns Firebase function event listener
     */
    onWriteGroupMember()
	{
		return null;

        // 1. set and return listener
		return this._functions.region(this._sRegion).database.ref(this._config['claims']['groups']['query'] + '/{sUserID}').onWrite(async (data, context) => {

            // a. init
            let user = null;
            let newCustomClaims = {};

            // b. check if item deleted
            if (data.before.val() && !data.after.val())
            {
                // I. register
                user = data.before.val();

                // I. reset
                newCustomClaims = this._config['claims']['data']['userReset'];
            }
            else
            {
                // I. register
                user = data.after.val();

                // II. set
                if (this._config['claims']['data']['userCustomClaimsProperty']) newCustomClaims = user[this._config['claims']['data']['userCustomClaimsProperty']];
            }

            // c. update
            await this._updateUserClaims(user, newCustomClaims);

            // d. end
            return null;
		});
	}



	// ----------------------------------------------------------------------------
	// --- Private methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Set superuser permissions for one or more users
	 * WARNING - USER NEEDS TO SIGN OUT AND SIGN IN TO REFRESH TOKEN
	 * @param user
	 * @returns {Promise<unknown>}
	 * @private
	 */
	_setSuperuserCustomClaims(user)
	{
		return new Promise(async (resolve, reject) => {

			// 1. register
			let aUsers = this._config['claims']['users']['super'];

			// 2. verify and convert to array
			if (DataUtils.isObject(aUsers)) aUsers = [this._config['claims']['users']['super']];

			// 3. validate
			if (!Array.isArray(aUsers)) reject('Superuser custom claims config needs to be either an object or an array of objects');

			// 4. find user
			for (let nIndex = 0; nIndex < aUsers.length; nIndex++)
			{
				// a. register
				let userConfig = aUsers[nIndex];

				// b. validate or skip
				if (!DataUtils.isObject(userConfig)) continue;

				// c. validate and skip
				if (!userConfig.email)
                {
                    // I. convert to array
                    let aEmails = (Array.isArray(userConfig.email)) ? userConfig.email : [userConfig.email];


					// validate email


                    // II. check if email is marked as superuser
                    if (!aEmails.some(email => email.toLowerCase() === user.email.toLowerCase())) continue;
                }

				// d. validate or skip
				if (!DataUtils.isObject(userConfig.data)) continue;

				// e. set custom claim for the user
				await this._admin.auth().setCustomUserClaims(user.uid, userConfig.data);
			}

            // 5. exit
            resolve();
		});
	}

    /**
     * Set custom claims for a user based on data
     * @param user
     * @returns {Promise<unknown>}
     * @private
     */
    _setAllUsersCustomClaims(user)
	{
		return new Promise(async (resolve, reject) => {

			// 1. connect
			const ref = this._realtimeDatabase.ref(this._config['claims']['data']['userPath']);

			// 2. load
			ref.orderByChild('email').equalTo(user.email).once('value')
				.then(async snapshot => {

					// a. exit is no user registered
					if (!snapshot.exists()) { resolve(); return; }

					// b. register
					const teamMembers = snapshot.val();

					// c. isolate
					let teamMember = teamMembers[Object.keys(teamMembers)[0]];

					// d. find
					let userRecord = await this._admin.auth().getUserByEmail(user.email)

					// e. load
					let userClaims = userRecord.customClaims || {};

					// f. merge
					userClaims = DataUtils.mergeDeep(userClaims, teamMember[this._config['claims']['data']['userCustomClaimsKey']] || {});

					// g. store updates claims
					await this._admin.auth().setCustomUserClaims(userRecord.uid, userClaims);

					// h. report ready
					resolve();

				})
				.catch(error => reject(error));
		})
	}

    /**
     * Get user record and create if not exists
     * @param firebaseAdmin
     * @param sEmail
     * @returns {Promise<unknown>}
     * @private
     */
	_getRegisteredUser(firebaseAdmin, sEmail)
	{
		return new Promise(async (resolve, reject) => {

			await firebaseAdmin.auth().getUserByEmail(sEmail)
				.then(async (userRecord) => {

					resolve(userRecord);

				})
				.catch(async error => {

					// Create the user
					const userRecord = await firebaseAdmin.auth().createUser({ email: sEmail }); // displayName: sDisplayName

					resolve(userRecord);
				})
		});
	}

    /**
     * Update user claims
     * @param user
     * @param newCustomClaims
     * @returns {Promise<void>}
     * @private
     */
    async _updateUserClaims(user, newCustomClaims)
    {
        // 1. load
        let userRecord = await this._getRegisteredUser(this._admin, user.email);

        // 2. validate or skip
        if (!newCustomClaims) return;

        // 3. register or default
        let currentUserClaims = userRecord['customClaims'] || {};

        // 4. register
        const sUserCustomClaimsKey = this._config['claims']['data']['userCustomClaimsKey'];

        // 5. validate or init
        if (!currentUserClaims[sUserCustomClaimsKey]) currentUserClaims[sUserCustomClaimsKey] = {};

        // 6. update
        Object.keys(newCustomClaims).forEach(sKey => {

            if (newCustomClaims[sKey] === undefined)
            {
                delete currentUserClaims[sKey];
            }
            else
            {
                currentUserClaims[sUserCustomClaimsKey][sKey] = newCustomClaims[sKey];
            }
        });

        // 7. store
        await this._admin.auth().setCustomUserClaims(userRecord.uid, currentUserClaims);
    }

	/**
	 * Check if email is allowed
	 * @author - Sebastian Kersten
	 * @author - ChatGPT
	 * @param email
	 * @param config
	 * @returns {*|boolean}
	 */
	async isEmailAllowed(email, config) {
		// Convert the input email to lowercase
		const lowerCaseEmail = email.toLowerCase();

		// Helper function to handle both async and direct functions
		const executeFunction = async (func, email) => {
			const result = func(email);
			// Check if the function returns a Promise and await it if so
			return result instanceof Promise ? await result : result;
		};

		// If config is empty, allow all emails
		if (!config || (Array.isArray(config) && config.length === 0)) {
			return true;
		}

		// If config is a string, compare it in lowercase
		if (typeof config === 'string') {
			return lowerCaseEmail === config.toLowerCase();
		}

		// If config is a function, call it with the email
		if (typeof config === 'function') {
			return await executeFunction(config, lowerCaseEmail);
		}

		// If config is an array, check each element
		if (Array.isArray(config)) {
			for (const rule of config) {
				// If the rule is a string, compare it in lowercase
				if (typeof rule === 'string' && lowerCaseEmail === rule.toLowerCase()) {
					return true;
				}

				// If the rule is a RegExp, test the email against it
				if (rule instanceof RegExp && rule.test(lowerCaseEmail)) {
					return true;
				}

				// If the rule is a function, call it with the email
				if (typeof rule === 'function' && await executeFunction(rule, lowerCaseEmail)) {
					return true;
				}
			}
			// If no rule matched, return false
			return false;
		}

		// If config is none of the above, return false
		return false;
	}

	/**
	 * Process data object with async functions, values and objects
	 * @author - Sebastian Kersten
	 * @author - ChatGPT
	 * @param data
	 * @returns {Promise<*|{}>}
	 */
	async processDataObject(data)
	{
		// Helper function to handle both async and direct functions
		const executeFunction = async (func) => {
			const result = func();
			// Check if the function returns a Promise and await it if so
			return result instanceof Promise ? await result : result;
		};

		// Recursive function to process each value in the object
		const processValue = async (value) => {
			if (typeof value === 'function') {
				// If the value is a function, execute it
				return await executeFunction(value);
			} else if (value && typeof value === 'object' && !Array.isArray(value)) {
				// If the value is an object, recursively process each property
				const processedObject = {};
				for (const key in value) {
					processedObject[key] = await processValue(value[key]);
				}
				return processedObject;
			} else {
				// If the value is neither a function nor an object, return it as is
				return value;
			}
		};

		return await processValue(data);
	}

	/**
	 * Process id with async functions and values
	 * @author - Sebastian Kersten
	 * @author - ChatGPT
	 * @param id
	 * @returns {Promise<*>}
	 */
	async processId(id)
	{
		// Helper function to execute and possibly await the function
		const executeFunction = async (func) => {
			const result = func();
			// Check if the function returns a Promise and await it if so
			return result instanceof Promise ? await result : result;
		};

		// If the id is a function, execute it. Otherwise, return it as is.
		return typeof id === 'function' ? await executeFunction(id) : id;
	}

}


module.exports = CustomClaims;
