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
        if (!this._config || typeof this._config !== 'object' || typeof this._config['claims'] !== 'object' || typeof this._config['claims']['data'] !== 'object')
        {
            // a. report
            console.log('🚨 - WARNING - Please provide a valid config object')

            // b. exit
            return;
        }

        // 3. validate config object's data property
        if (!this._config['claims']['data']['userPath'] || !this._config['claims']['data']['userCustomClaimsProperty']  || !this._config['claims']['data']['userCustomClaimsKey'])
        {
            // a. report
            console.log('🚨 - WARNING - Please add userPath, userCustomClaimsProperty, and userCustomClaimsKey to the config object')

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
    setSpecialClaims()
	{
        // 1. validate
        if (!this._config || typeof this._config !== 'object' || typeof this._config['claims'] !== 'object' || typeof this._config['claims']['special'] !== 'object')
        {
            // a. report
            console.log('🚨 - WARNING - Please provide a valid config object')

            // b. exit
            return;
        }

        // 2. set and return listener
		return this._functions.region(this._sRegion).auth.user().onCreate(async (user) => {

			// a. set special permissions
			await this._setSpecialCustomClaims(user);

			// b. set custom claims for new user based on items in database
			await this._setCustomClaimsFromData(user);

            // c. end
            return null;
		});
	}

    /**
     * Set user custom claims based on data
     * @returns Firebase function event listener
     */
	setDataClaims()
	{
        // 1. set and return listener
		return this._functions.region(this._sRegion).database.ref(this._config['claims']['data']['userPath'] + '/{sUserID}').onWrite(async (data, context) => {

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
	 * Set special permissions for one or more users
	 * WARNING - USER NEEDS TO SIGN OUT AND SIGN IN TO REFRESH TOKEN
	 * @param user
	 * @returns {Promise<unknown>}
	 * @private
	 */
	_setSpecialCustomClaims(user)
	{
		return new Promise(async (resolve, reject) => {

			// 1. register
			let aUsers = this._config['claims']['special'];

			// 2. verify and convert to array
			if (DataUtils.isObject(aUsers)) aUsers = [this._config['claims']['special']];

			// 3. validate
			if (!Array.isArray(aUsers)) reject('special custom claims config needs to be either an object or an array of objects');

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

                    // II. check if email has special permissions
                    if (!aEmails.some(email => email.toLowerCase() === user.email.toLowerCase())) continue;
                }

				// d. validate or skip
				if (!DataUtils.isObject(userConfig.customUserClaims)) continue;

				// e. set custom claim for the user
				await this._admin.auth().setCustomUserClaims(user.uid, userConfig.customUserClaims);
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
	_setCustomClaimsFromData(user)
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
}


module.exports = CustomClaims;
