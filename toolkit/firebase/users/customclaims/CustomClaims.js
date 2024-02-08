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

        // 2. validate config object
        if (!this._config || typeof this._config !== 'object' || typeof this._config['claims'] !== 'object' || typeof this._config['claims']['users'] !== 'object')
        {
            // a. report
            console.log('🚨 - WARNING - Please provide a valid config object containing a claims.users object')

            // b. exit
            return;
        }

        // 3. validate config object's data property
        // if (!this._config['claims']['groups']['query'] || !this._config['claims']['data']['userCustomClaimsProperty']  || !this._config['claims']['data']['userCustomClaimsKey'])
        // {
        //     // a. report
        //     console.log('🚨 - WARNING - Please add claims.groups.query, userCustomClaimsProperty, and userCustomClaimsKey to the config object')
		//
        //     // b. exit
        //     return;
        // }
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
		return this._functions.region(this._sRegion).auth.user().onCreate(async (user) => {

			// a. register
			const usersConfig = this._config.claims.users;
			const groupsConfig = this._config.claims.groups;

			// b. set superuser permissions (email is required to avoid making everybody a superuser)
			if (usersConfig.super && usersConfig.super.email) user = await this._setUserCustomClaims(user, usersConfig.super);

			// c. verify if user is not a superuser
			const bIsEmailAllowed = await this._isEmailAllowed(user.email, usersConfig.super?.email);

			// d. set permissions for all users except superusers
			if (usersConfig.other && !bIsEmailAllowed) user = await this._setUserCustomClaims(user, usersConfig.other);

			// e. set permissions for all users
			if (usersConfig.all) user = await this._setUserCustomClaims(user, usersConfig.all);

			// f. initiate group
			if (groupsConfig) user = await this._createGroup(user, groupsConfig); // chekc all invites, check all groups, check all members

			// g. end
            return null;
		});
	}

	_createGroup(user, groupsConfig)
	{


		console.log('groupsConfig =', groupsConfig);


		// if not in members -> create group
		//      handle onCreate
		//      store group in database
		//      add member with groupid in database
		// else
		//     add to group(s)


		// groups/invites -> auto load latest claims
		// groups/members



		return new Promise(async (resolve, reject) => {


			// check queries

			if (!groupsConfig.queries || !groupsConfig.queries.groups || !groupsConfig.queries.members) return reject('No queries found in the groupsConfig object');


			const sGroupsQuery = groupsConfig.queries.groups;
			const sMembersQuery = groupsConfig.queries.members;


			const dbMembers = this._admin.database().ref(sMembersQuery + '/' + user.uid);

			const memberSnapshot = await dbMembers.once('value');


			if (!memberSnapshot.exists())
			{

				//      handle onCreate
				//      store group in database
				//      add member with groupid in database



				// define ID or default on key (set current key)



				// get data


				let member = {
					name: user.displayName,
					email: user.email
				}

				if (groupsConfig.onCreate && groupsConfig.onCreate.data) member = DataUtils.mergeDeep(groupsConfig.onCreate.data, member);




				let sGroupID = await this._processId(groupsConfig.id, user.email) || null;


				let bGroupExists = false;


				if (sGroupID === null)
				{
					// prepare
					const dbGroups = this._admin.database().ref(sGroupsQuery);

					let members = {};
					members[user.uid] = member;

					await dbGroups.push(members);
				}
				else
				{
					// prepare
					const dbGroups = this._admin.database().ref(sGroupsQuery + '/' + sGroupID);


					let groupsSnapshot = await dbGroups.once('value');



					let members = (groupsSnapshot.exists()) ? groupsSnapshot.val() : {};
					members[user.uid] = member;


					bGroupExists = groupsSnapshot.exists();


					await dbGroups.set(members);
				}


				const memberGroups = {}
				memberGroups[sGroupID] = true;

				await dbMembers.set(memberGroups);


				const sCurrentGroupKey = (groupsConfig.currentGroupKey || 'currentGroup');

				let userGroupCustomClaims = {}
				userGroupCustomClaims[sCurrentGroupKey] = sGroupID;


				let memberCustomClaims = {};

				if (!bGroupExists)
				{
					if (groupsConfig.onCreate && groupsConfig.onCreate.data) memberCustomClaims = groupsConfig.onCreate.data;
				}
				else
				{
					if (groupsConfig.onAdd && groupsConfig.onAdd.data) memberCustomClaims = groupsConfig.onAdd.data;
				}

				user = await this._storeUserCustomClaims(user, DataUtils.mergeDeep(memberCustomClaims, userGroupCustomClaims));

			}
			else
			{

				const member = memberSnapshot.val();





				//this._storeUserCustomClaims(user, data)



				//     add to existing group(s)

			}


			resolve(user);

		});

	}


    /**
     * Set user custom claims based on data
     * @returns Firebase function event listener
     */
    onWriteGroupMember()
	{
		console.log('onWriteGroupMember');

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
	 * Set permissions for one or more users
	 * WARNING - USER NEEDS TO SIGN OUT AND SIGN IN TO REFRESH TOKEN
	 * @param user
	 * @param config
	 * @returns {Promise<unknown>}
	 * @private
	 */
	_setUserCustomClaims(user, config)
	{
		return new Promise(async (resolve, reject) => {

			// 1. validate or exit
			if (!config.data) return resolve(user);

			// 2. validate if user is allowed or exit
			if (await this._isEmailAllowed(user.email, config.email) === false) return resolve(user);

			// 3. process data
			const customClaims = await this._processDataObject(config.data);

			// 4. store user custom claims
			this._storeUserCustomClaims(user, customClaims)
				.then(updatedUser => resolve(updatedUser))
				.catch(error => resolve(user));
		});
	}

	_storeUserCustomClaims(user, data)
	{
		return new Promise(async (resolve, reject) => {

			// 1. store
			await this._admin.auth().setCustomUserClaims(user.uid, DataUtils.mergeDeep(user.customClaims, data));

			// 2. load latest user data
			this._admin.auth().getUser(user.uid)
				.then(updatedUser => resolve(updatedUser))
				.catch(error => resolve(user));
		});
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

			if (!sEmail) return reject('No email provided');

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
	async _isEmailAllowed(email, config)
	{
		// Convert the input email to lowercase
		const lowerCaseEmail = email.toLowerCase();

		// If config is not an array, make it an array
		if (!Array.isArray(config)) {
			config = [config];
		}

		// Helper function to handle both async and direct functions
		const executeFunction = async (func) => {
			const result = func(lowerCaseEmail);
			// Check if the function returns a Promise and await it if so
			return result instanceof Promise ? await result : result;
		};

		// Process each element in the config array
		for (const rule of config) {
			// If config is empty, allow all emails
			if (!rule) {
				return true;
			}

			// If the rule is a string, compare it in lowercase
			if (typeof rule === 'string') {
				if (lowerCaseEmail === rule.toLowerCase()) {
					return true;
				}
			} else if (rule instanceof RegExp) {
				// If the rule is a RegExp, test the email against it
				if (rule.test(lowerCaseEmail)) {
					return true;
				}
			} else if (typeof rule === 'function') {
				// If the rule is a function, call it and check the result
				if (await executeFunction(rule)) {
					return true;
				}
			}
		}

		// If no rule matched, return false
		return false;
	}

	/**
	 * Process data object with async functions, values and objects
	 * @author - Sebastian Kersten
	 * @author - ChatGPT
	 * @param data
	 * @returns {Promise<*|{}>}
	 */
	async _processDataObject(data)
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
	async _processId(id, sEmail)
	{
		// Helper function to execute and possibly await the function
		const executeFunction = async (func) => {
			const result = func(sEmail);
			// Check if the function returns a Promise and await it if so
			return result instanceof Promise ? await result : result;
		};

		// If the id is a function, execute it. Otherwise, return it as is.
		return typeof id === 'function' ? await executeFunction(id, sEmail) : id;
	}

}


module.exports = CustomClaims;
