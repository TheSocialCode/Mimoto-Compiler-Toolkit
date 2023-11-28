/**
 * Mimoto Firebase Toolkit - Mailer - A tiny wrapper around the Firebase extension "Trigger Email from Firestore"
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import Mimoto classes
const DataUtils = require('../../../utils/DataUtils');



// ----------------------------------------------------------------------------
// --- Public methods ---------------------------------------------------------
// ----------------------------------------------------------------------------


/**
 * Send mail
 * @param firebaseAdmin - Reference to a configured Firebase Admin SDK
 * @param config
 * @param data
 * @returns {Promise<unknown>}
 */
function sendMail(firebaseAdmin, config = {}, data = {})
{
	return new Promise(async (resolve, reject) => {

		// 1. validate or exit
		if (!firebaseAdmin) { reject('Missing firebaseAdmin parameter'); return; }

		// 2. init
		let mailRequest = { message: { text: '', html: '' }};


		// --- prepare mail


		// 3. configure
		if (config.to) mailRequest.to = config.to;
		if (config.from) mailRequest.from = config.from;
		if (config.cc) mailRequest.cc = config.cc;
		if (config.bcc) mailRequest.bcc = config.bcc;
		if (config.subject) mailRequest.message.subject = config.subject;

		// 4. configure text template
		if (config.templates?.text?.src)
		{
			try {
				mailRequest.message.text = await DataUtils.readFile(config.templates.text.src);
			}
			catch (error) { reject(error); return; }
		}
		else if (config.templates.text)
		{
			mailRequest.message.text = config.templates.text;
		}

		// 5. configure html template
		if (config.templates?.html?.src)
		{
			try {
				mailRequest.message.html = await DataUtils.readFile(config.templates.html.src);
			}
			catch (error) { reject(error); return; }
		}
		else if (config.templates.html)
		{
			mailRequest.message.html = config.templates.html;
		}



		// --- compose mail ---


		// 6 convert data to deep vars
		let aDeepValues = DataUtils.collectDeepValues(data);

		// 7. inject vars into templates
		mailRequest.message.text = DataUtils.replaceVars(mailRequest.message.text, aDeepValues);
		mailRequest.message.html = DataUtils.replaceVars(mailRequest.message.html, aDeepValues);



		// --- request email


		// 8. init
		const firestoreDB = firebaseAdmin.firestore();

		// 9. store
		firestoreDB.collection("mail").add(mailRequest)
			.then((data) => resolve(data))
			.catch(error => reject(error));
	});
}



// ----------------------------------------------------------------------------
// --- Class definition -------------------------------------------------------
// ----------------------------------------------------------------------------


module.exports = {
	sendMail
};
