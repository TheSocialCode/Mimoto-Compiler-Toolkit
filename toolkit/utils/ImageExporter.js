/**
 * Mimoto Firebase Toolkit - ImageExporter - A tiny toolset to handle import exports using Firebase's event system
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import core classes
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

// 2. import 3rd party SDKs
const sharp = require('sharp');


class ImageExporter
{

	// environment
	_admin = null;
	_functions = null;
	_sRegion = null;

	// data
	_config = null;

	// utils
	_realtimeDatabase = null;



	// ----------------------------------------------------------------------------
	// --- Constructor ------------------------------------------------------------
	// ----------------------------------------------------------------------------


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


		// // 2. validate config object
		// if (!this._config || typeof this._config !== 'object' || typeof this._config['claims'] !== 'object' || typeof this._config['claims']['users'] !== 'object')
		// {
		// 	// a. report
		// 	console.log('🚨 - WARNING - Please provide a valid config object containing a claims.users object')
		//
		//
		// 	// '/mimoto/google/GoogleDriveConnector/currentExportRequestId');
		//
		// 	// autoRemove: false,
		//
		//
		// 	// b. exit
		// 	return;
		// }
	}



	// ----------------------------------------------------------------------------
	// --- Public methods ---------------------------------------------------------
	// ----------------------------------------------------------------------------


	/**
	 * Setup queue
	 * @returns Firebase function event listener
	 */
	setListener(config = {})
	{
		// 1. validate
		if (!config) return 'Please provide an image exporter configuration object';

		// 2. validate
		if (!config.path) return 'Please provide a data path to monitor';

		// 3. store
		config = {
			path: config.path,
			exportDataPath: config.exportDataPath || '/mimoto/utils/imageExporter/exportRequests',
		}

		// 4. prepare
		const classRoot = this;

		// 5. listen
		return this._functions.region(this._sRegion).database.ref(config.path + '/meta').onWrite(async (snapshot, context) => {

			// I. register
			const meta = snapshot.after.val();
			const metaBefore = snapshot.before.val();

			console.log('metaBefore =', metaBefore);


			// Only proceed if we have both imageOriginal and imageFocusPoint
			if (!meta.path || !meta.focusPoint) return null;

			// validate or exit
			if (!meta.export || !meta.export.sizes) return null;
			
			for (const sSizeName in meta.export.sizes)
			{
				const [width, height] = meta.export.sizes[sSizeName].split('x').map(Number);

				// Create image processing request in Firestore
				const exportRequest = {
					image: {
						focusPoint: meta.focusPoint,
						originalFile: meta.path + '/original' + path.extname(meta.name), // TODO - STORE previous extension
						size: {
							name: sSizeName,
							width: width,
							height: height
						},
						exportDestination: meta.path + '/' + sSizeName,
						previousExtension: (metaBefore) ? path.extname(metaBefore.name) : null
					},
					status: 'todo'
				};

				console.log('');
				console.log('💞 exportRequest =', exportRequest);
				console.log('');
				console.log('');

				// Add to Realtime Database to trigger image processing
				await classRoot._realtimeDatabase.ref(config.exportDataPath).push(exportRequest);
			}

			// Remove original if extension changed
			if (metaBefore && path.extname(meta.name) !== path.extname(metaBefore.name)) {
				const originalPath = meta.path + '/original' + path.extname(metaBefore.name);
				// Delete from Storage instead of Realtime Database
				const bucket = classRoot._admin.storage().bucket();
				await bucket.file(originalPath).delete().catch(error => {
					console.error(`Error deleting original file ${originalPath}:`, error);
				});
			}

			return null;
		});
	}

	async exportImage(data, key = null)
	{
		console.log('🌱🌱🌱 - handleImageExportRequest - data:', data);


		// handleImageExportRequest - data: {
		// 	id: '-OL-hHl0p5gwv7H0U013',
		// 	exportDestination: 'articles_components_draft/-OKfR4Ts8edc_LKiYhQy/image/tablet',
		// 	focusPoint: { x: 0.5, y: 0.5 },
		// 	path: 'articles_components_draft/-OKfR4Ts8edc_LKiYhQy/image/hero_lips.png',
		// 	size: '1024x400',
		// 	status: 'todo'
		// }


		const { focusPoint:imageFocusPoint, originalFile:imageOriginalFile, size:imageSize, exportDestination:imageExportDestination, previousExtension:previousExtension } = data.image;


		console.log('focusPoint =', imageFocusPoint);
		console.log('originalFile =', imageOriginalFile);
		console.log('size =', imageSize);
		console.log('exportDestination =', imageExportDestination);
		console.log('previousExtension =', previousExtension);



		const extension = path.extname(imageOriginalFile);
		const filePathWithoutExtension = path.join(
			path.dirname(imageOriginalFile) //,
			//path.basename(imageOriginalFile)
		);

		const resizedPath = `${filePathWithoutExtension}/${imageSize.name}${extension}`; // Define resizedPath with the file name and size

		// console.log('extension =', extension); // This will log the file name without the extension
		// console.log('fileNameWithoutExtension =', fileNameWithoutExtension); // This will log the file name without the extension




		const tempFilePath = path.join(os.tmpdir(), `${filePathWithoutExtension}${extension}`); // Temporary path for the original image

		// Ensure the directory exists
		await fs.mkdir(path.dirname(tempFilePath), { recursive: true });



		const bucket = this._admin.storage().bucket();
		await bucket.file(imageOriginalFile).download({ destination: tempFilePath });

		const focalX = imageFocusPoint.x;
		const focalY = imageFocusPoint.y;

		const originalImage = sharp(tempFilePath); // Use the original image path for input
		const metadata = await originalImage.metadata();

		//const [width, height] = imageSize.split('x').map(Number);
		const width = imageSize.width;
		const height = imageSize.height;

		// Calculate aspect ratios
		const aspectRatio = width / height;
		const imageAspectRatio = metadata.width / metadata.height;

		let resizeWidth, resizeHeight;

		// Determine resize dimensions to fit the image within the target size
		if (imageAspectRatio > aspectRatio) {
			// Image is wider than the target aspect ratio
			resizeWidth = Math.round(height * imageAspectRatio);
			resizeHeight = height;
		} else {
			// Image is taller than the target aspect ratio
			resizeWidth = width;
			resizeHeight = Math.round(width / imageAspectRatio);
		}

		// Resize the image
		const tempResizedPath = path.join(os.tmpdir(), `${filePathWithoutExtension}/${imageSize.name}${extension}`); // Ensure a different path for resized image

		// Ensure the directory exists
		await fs.mkdir(path.dirname(tempResizedPath), { recursive: true });

		await originalImage
			.resize(resizeWidth, resizeHeight)
			.toFile(tempResizedPath);

		// Re-open the resized image for cropping
		const resizedImage = sharp(tempResizedPath);
		const resizedMetadata = await resizedImage.metadata();

		// Calculate crop dimensions
		const cropWidth = Math.min(width, resizedMetadata.width);
		const cropHeight = Math.min(height, resizedMetadata.height);

		const cropX = Math.max(0, Math.min(resizedMetadata.width - cropWidth, Math.floor((focalX * resizedMetadata.width) - cropWidth / 2)));
		const cropY = Math.max(0, Math.min(resizedMetadata.height - cropHeight, Math.floor((focalY * resizedMetadata.height) - cropHeight / 2)));

		// Crop the image
		const finalResizedPath = path.join(os.tmpdir(), `${filePathWithoutExtension}/${imageSize.name}-final${extension}`); // Ensure a different path for final output
		await resizedImage
			.extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
			.toFile(finalResizedPath); // Use a different path for output

		await bucket.upload(finalResizedPath, {
			destination: resizedPath,
			metadata: {
				contentType: `image/${extension.slice(1)}`,
				metadata: {
					'Content-Disposition': 'inline'
				}
			}
		});

		// Get the file reference
		const file = bucket.file(resizedPath);

		await file.setMetadata({
			contentType: `image/${extension.slice(1)}`,
			metadata: {
				'Content-Disposition': 'inline'
			}
		});

		
		// Check if there's a previous file with a different extension that needs to be cleaned up
		if (previousExtension && previousExtension !== extension) {
			const previousResizedPath = resizedPath.replace(extension, previousExtension);
			const previousFile = bucket.file(previousResizedPath);
			
			// Check if the previous file exists
			const [exists] = await previousFile.exists();
			
			if (exists) {
				// Delete the old file with different extension
				await previousFile.delete().catch(error => {
					console.error(`Error deleting previous file ${previousResizedPath}:`, error);
				});
			}
		}



		
		// console.log('🚨🚨🚨 resizedPath:', resizedPath);

		// Determine if running in the emulator
		const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
		// console.log('isEmulator:', isEmulator);

		async function getViewURL(bucket, resizedPath)
		{
			await bucket.file(resizedPath).makePublic();
			const [metadata] = await bucket.file(resizedPath).getMetadata();
			return metadata.mediaLink;
		}

		const url = await getViewURL(bucket, resizedPath);
		// const url = isEmulator
		// 	? `http://localhost:9012/v0/b/${bucket.name}/o/${encodeURIComponent(resizedPath)}?alt=media`
		// 	: await getViewURL(bucket, resizedPath);

		// console.log('View URL:', url);


		// Get the current URL from the exportDestination
		const currentUrlSnapshot = await this._realtimeDatabase.ref(imageExportDestination).once('value');
		const currentUrl = currentUrlSnapshot.val();

		if (currentUrl)
		{
			// Extract the file path from the current URL
			const currentFilePath = this._extractFileName(currentUrl, isEmulator, bucket);

			if (currentFilePath) {
				// Delete the existing file from the storage bucket
				const currentFile = bucket.file(currentFilePath);

				// Check if the file exists
				const [exists] = await currentFile.exists();

				if (exists) {
					// If the file exists, delete it
					await currentFile.delete().catch(error => {
						console.error(`Error deleting file ${currentFilePath}:`, error);
					});
				} else {
					console.log(`File does not exist: ${currentFilePath}`);
				}
			}
		}

		// console.log('url =', url);


		// Set the new URL in the Realtime Database
		await this._realtimeDatabase.ref(imageExportDestination).set(url);

		// Update the image path in the database

		try {
			// Check if the file exists before attempting to delete
			await fs.access(tempFilePath);
			await fs.unlink(tempFilePath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				console.error(`Error deleting file ${tempFilePath}:`, error);
			}
		}

		try {
			// Check if the resized file exists before attempting to delete
			await fs.access(tempResizedPath);
			await fs.unlink(tempResizedPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				console.error(`Error deleting file ${tempResizedPath}:`, error);
			}
		}
	}



	// ----------------------------------------------------------------------------
	// --- Private methods --------------------------------------------------------
	// ----------------------------------------------------------------------------


	_extractFileName(url, bIsEmulator, bucket)
	{
		const urlObject = new URL(url);
		let pathname = urlObject.pathname;

		// Decode the URL-encoded path
		pathname = decodeURIComponent(pathname);

		// Check if the URL is from the emulator
		if (bIsEmulator) {
			// Emulator URL format: /v0/b/bucket-name/o/path/to/file.jpg
			// Remove the prefix "/v0/b/bucket-name/o/"
			const prefix = `/v0/b/${bucket.name}/o/`;
			pathname = pathname.replace(prefix, '');
		} else {
			// Production URL format: /bucket-name/path/to/file.jpg
			// Remove the prefix "/bucket-name/"
			const prefix = `/${bucket.name}/`;
			pathname = pathname.replace(prefix, '');
		}

		// Extract the file name from the remaining path
		// const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
		const sFullPath = pathname;
		return sFullPath;
	}

}

module.exports = ImageExporter;