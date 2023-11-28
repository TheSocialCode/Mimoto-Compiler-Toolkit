/**
 * Mimoto Firebase Toolkit - GPT - Conversation GPT - A tiny communication focused layer on top of OpenAI's GPT
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */

'use strict';


// import OpenAI classes
const {Configuration, OpenAIApi} = require("openai");
// import http, { IncomingMessage } from 'http';

// import Mimoto classes
const StreamingData = require("./common/StreamingData");


// let configTemplate = {
//
// }



// ----------------------------------------------------------------------------
// --- Class definition -------------------------------------------------------
// ----------------------------------------------------------------------------



class ConversationGPT
{
	// config
	_config;

	// utils
	_realtimeDB;



	/**
	 * Constructor
	 * @param firebaseAdmin
	 * @param config
	 */
	constructor(firebaseAdmin, config)
	{
		// 1. store
		this._config = config;

		// 2. init
		this._realtimeDB = firebaseAdmin.database();
	}

	/**
	 * Ask GPT a question
	 * @param aMessages
	 * @param settings
	 * @returns {Promise<unknown>}
	 */
	async ask(aMessages, settings = {})
	{
		console.log('🍄 request =', aMessages);

		return new Promise(async (resolve, reject) => {


			// settings.stream = true;

			// 1. init
			const openai = new OpenAIApi(new Configuration({ apiKey: this._config.openai.key }));

			// 2. compose GPT config
			let gptConfig = {
				model: settings.model || 'gpt-3.5-turbo',
				messages: aMessages || [],
				stream: (settings.stream === true),
			};

			// 3. compose GPT options
			let gptOptions = (settings.stream === true) ? { responseType: 'stream' } : undefined;

			// 4. select
			if (settings.stream === true)
			{

				let streamingData = new StreamingData();


				const completion = await openai.createChatCompletion(gptConfig, gptOptions);

				const stream = completion.data;// as unknown as IncomingMessage;

				stream.on('data', (chunk) => {
					const payloads = chunk.toString().split("\n\n");
					for (const payload of payloads) {
						if (payload.includes('[DONE]')) return;
						if (payload.startsWith("data:")) {
							try {

								const data = JSON.parse(payload.replace("data: ", ""));

								const chunk = data.choices[0].delta?.content;
								if (chunk) {

									// console.log(chunk);

									streamingData.data(chunk);

								}
							} catch (error) {

								streamingData.error(`Error with JSON.parse and ${payload}.\n${error}`);
								// console.log(`Error with JSON.parse and ${payload}.\n${error}`);
							}
						}
					}
				});

				stream.on('end', () => {
					setTimeout(() => {
						// console.log('\nStream done')

						streamingData.done();

						// res.send({ message: 'Stream done' });
					}, 10);
				});

				stream.on('error', (err) => {
					console.log(err);

					streamingData.error(err);

					// res.send(err);
				});


				resolve(streamingData);
			}
			else
			{
				openai.createChatCompletion(gptConfig)
					.then(async chatData => {

						// register
						let value = chatData.data.choices[0].message.content;


						// verify
						if (settings.json)
						{
							try {

								value = JSON.parse(value);
							}
							catch(error) {

								console.log('🚨 error while parsing JSON =', error);

								// report
								reject('Error while parsing JSON');
								return;
							}
						}

						if (settings.storeAt)
						{
							let dbStoreAt = this._realtimeDB.ref(settings.storeAt);

							// 6. update
							await dbStoreAt.set(value);
						}


						resolve(value);

					})
					.catch(error => {

					});
			}

		});
	}

}

module.exports = ConversationGPT;
