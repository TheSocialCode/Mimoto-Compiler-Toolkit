/**
 * Mimoto Firebase Toolkit - Queue - A tiny toolset to handle queues using Firebase's event system
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import 3rd party classes
const UniqID = require('uniqid');


class Queue
{

	// environment
	_admin = null;
	_functions = null;
	_sRegion = null;

	// data
	_config = null;

	// utils
	_realtimeDatabase = null;
	_queues = {};

	/**
	 * Constructor
	 * @param admin
	 * @param functions
	 * @param sRegion
	 * @param config
	 */
	constructor(admin, functions, sRegion = 'us-central1', config = {})
	{
		// 1. store
		this._admin = admin;
		this._functions = functions;
		this._realtimeDatabase = admin.database();
		this._sRegion = sRegion;
		this._config = config;
	}






	// ----------------------------------------------------------------------------
	// --- Public methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Setup queue
	 * @returns Firebase function event listener
	 */
	setUpQueue(config = {})
	{
		// 1. validate
		if (!config) return 'Please provide a queue configuration object';

		// 2. validate
		if (!config.data) return 'Please provide a data path to monitor';

		// 3. prepare
		const sQueueID = config.data;

		// 4. store
		this._queues[sQueueID] = {
			data: config.data,
			statusProperty: config.statusProperty || 'status',
			states: {
				todo: config.states?.todo || 'todo',
				doing: config.states?.doing || 'doing',
				done: config.states?.done || 'done',
				error: config.states?.error || 'error'
			},
			maxItemsDoing: 1, //config.maxItemsDoing || 1, // UNSUPPORTED FOR NOW DUE TO LOCK FEATURE THAT ALLOWS ONE ITEM AT A TIME
			controller: config.controller || '/mimoto/utils/queue/lock/' + sQueueID,
			stats: config.stats || null,
			onDoing: config.onDoing || null,
			onDone: config.onDone || null,
			onFinish: config.onFinish || null,
			onError: config.onError || null,
			autoRemove: (config.autoRemove === true)
		}

		// 5. determine queue controller type
		const bHasController = false; //(!config.controller);

		// 6. prepare
		const classRoot = this;

		// 7. select
		switch(bHasController)
		{
			// case true:

			// 	// a. use a central controller data path to manage the queue
			// 	return this._functions.region(this._sRegion).database.ref(this._queues[sQueueID].controller).onWrite(async (snapshot, context) => {

			// 		// I. run
			// 		await classRoot._runQueue(sQueueID);

			// 	});

			case false:
			default:

				// a. use a status property on the data itself to manage the queue
				return this._functions.region(this._sRegion).database.ref(this._queues[sQueueID].data + '/{sItemID}/' + this._queues[sQueueID].statusProperty).onWrite(async (snapshot, context) => {

					// 1. validate or exit
					const statesToCheck = [
						this._queues[sQueueID].states.doing
					];

					if(this._queues[sQueueID].stats)
					{
						// 1. get stats ref
						const statsRef = this._admin.database().ref(this._queues[sQueueID].stats);

						// 2. get all items
						const itemsRef = this._admin.database().ref(this._queues[sQueueID].data);
						const itemsSnapshot = await itemsRef.once('value');
						const items = itemsSnapshot.val() || {};

						// 3. init counters
						const stats = {
							todo: 0,
							doing: 0,
							done: 0,
							error: 0,
							total: 0
						};

						// Count states and total
						Object.values(items).forEach(item => {
							const status = item[this._queues[sQueueID].statusProperty];
							stats.total++; // Increment total for each item
							if (stats.hasOwnProperty(status)) {
								stats[status]++;
							} else {
								// Count any other states not predefined
								stats[status] = (stats[status] || 0) + 1;
							}
						});

						// 5. store stats
						await statsRef.set(stats);
					}


					const allNonCustomStates = [
						this._queues[sQueueID].states.todo,
						this._queues[sQueueID].states.doing,
						this._queues[sQueueID].states.done,
						this._queues[sQueueID].states.error
					];

					if (statesToCheck.includes(snapshot.after.val())
						|| !allNonCustomStates.includes(snapshot.after.val())
						|| snapshot.before.val() === snapshot.after.val()
						|| !snapshot.after.exists()
					) return;

					await classRoot._runQueue(sQueueID);
				});
		}
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Run queue
	 * @returns {Promise<void>}
	 */
	// Function to process the queue of scans
	async _runQueue(sQueueID) {


		const lockAcquired = await this.acquireLock(sQueueID);

		if (!lockAcquired)
		{
			console.log('🔒 - Lock already acquired. Exiting...');
			return;
		}

		// Get the number of parallel calls allowed
		// const maxItemsDoing = parseInt(parser.parallelCalls) || 1; // Default to 1 if not set

		// Get current number of scans with status 'doing'
		const queueItemsRef = this._admin.database().ref(this._queues[sQueueID].data);
		const doingSnapshot = await queueItemsRef.orderByChild(this._queues[sQueueID].statusProperty).equalTo(this._queues[sQueueID].states.doing).limitToFirst(1).once('value');
		const currentDoingCount = doingSnapshot.numChildren();

		// console.log(`Current doing count: ${currentDoingCount}, Max parallel Open AI calls: ${maxParallelCalls}`);

		if (currentDoingCount >= this._queues[sQueueID].maxItemsDoing) {
			console.log('Maximum parallel scans reached, waiting...');
			return null;
		}

		// Calculate remaining slots for parallel processing
		// const nAvailableSlots = this._queues[sQueueID].maxItemsDoing - currentDoingCount;

		// Get scans with 'todo' status
		const todoSnapshot = await queueItemsRef.orderByChild(this._queues[sQueueID].statusProperty).equalTo(this._queues[sQueueID].states.todo).limitToFirst(1).once('value');
		const aTodoDocuments = [];
		todoSnapshot.forEach(item => {
			aTodoDocuments.push({
				id: item.key,
				...item.val()
			});
		});

		if (aTodoDocuments.length === 0)
		{

			await this.releaseLock(sQueueID);

			// Call onFinish if configured
			if (this._queues[sQueueID].onFinish) await this._queues[sQueueID].onFinish();

			// exit
			return;
		}

		// Process each scan and set status to 'doing'
		const itemsToProcess = await Promise.all(aTodoDocuments.map(async item => {
			try {
				// Update status to 'doing'
				await queueItemsRef.child(item.id).update({
					[this._queues[sQueueID].statusProperty]: this._queues[sQueueID].states.doing
				});
				return item;
			} catch (error) {
				console.error(`Error updating status for item ${item.id}:`, error);
				return null;
			}
		}));

		// Process items one by one
		for (const item of itemsToProcess) {

			try {
				if (this._queues[sQueueID].onDoing)
				{
					await this._queues[sQueueID].onDoing(item, item.id);
				}

				// Always release the lock, regardless of success or failure
				await this.releaseLock(sQueueID);

				// If onDoing succeeded, update status to 'done'
				await queueItemsRef.child(item.id).update({
					[this._queues[sQueueID].statusProperty]: this._queues[sQueueID].states.done
				});

				// Call onDone if configured
				if (this._queues[sQueueID].onDone) {
					await this._queues[sQueueID].onDone(item, item.id);
				}

				// Auto remove if configured
				if (this._queues[sQueueID].autoRemove)
				{
					await queueItemsRef.child(item.id).remove();
				}

			} catch (error) {
				console.error(`Error processing item ${item.id}:`, error);

				// Always release the lock, regardless of success or failure
				await this.releaseLock(sQueueID);

				try {
				   // Attempt to update status to 'error' and store the error
				   await queueItemsRef.child(item.id).update({
					   [this._queues[sQueueID].statusProperty]: this._queues[sQueueID].states.error,
					   error: error.message || error.toString() // Store error message
				   });
				} catch (updateError) {
					 console.error(`Failed to update item ${item.id} status to error:`, updateError);
				}

				// Call onError if configured
				if (this._queues[sQueueID].onError) {
					try {
						await this._queues[sQueueID].onError(error, item, item.id);
					} catch (onErrorError) {
						console.error(`Error executing onError callback for item ${item.id}:`, onErrorError);
					}
				}

			}
			// finally {

			// 	console.log('✅ ✅ ✅ ✅ ✅ ✅ ✅ Releasing lock... NEXT NEXT NEXT');

			// 	// Always release the lock, regardless of success or failure
			// 	await this.releaseLock(sQueueID);	
			// }
		}
	}

	async acquireLock(sQueueID)
	{
		const result = await this._realtimeDatabase.ref(this._queues[sQueueID].controller).transaction((current) =>
		{
			const nowTimestamp = Date.now();
			const nowDate = new Date(nowTimestamp); // Create a Date object for formatting

			if (!current || !current.locked || nowTimestamp - current.timestamp > 30000)
			{
				// Format the date as YYYY.mm.dd H:i:s
				const year = nowDate.getFullYear();
				const month = String(nowDate.getMonth() + 1).padStart(2, '0');
				const day = String(nowDate.getDate()).padStart(2, '0');
				const hours = String(nowDate.getHours()).padStart(2, '0');
				const minutes = String(nowDate.getMinutes()).padStart(2, '0');
				const seconds = String(nowDate.getSeconds()).padStart(2, '0');
				const formattedStartedAt = `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;

				return { locked: true, lockedBy: 'function-instance', timestamp: nowTimestamp, startedAt: formattedStartedAt };
			}
			// Abort the transaction if the lock is already held and hasn't expired
			return;
		});

		return result.committed;
	}

	async releaseLock(sQueueID)
	{
		await this._realtimeDatabase.ref(this._queues[sQueueID].controller).set({ locked: false, lockedBy: null, timestamp: 0 });
	}

	// async processItem(item)
	// {
	// 	console.log(`Processing item with createdAt: ${item.createdAt}`);
	// 	await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate task duration
	// }

}

module.exports = Queue;