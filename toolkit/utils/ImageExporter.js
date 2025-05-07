/**
 * Mimoto Firebase Toolkit - ImageExporter - A tiny toolset to handle import exports using Firebase's event system
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// 1. import core classes
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
// const axios = require('axios');
const mime = require('mime-types');

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
			console.log('meta =', meta);


			// Only proceed if we have path, focusPoint, and name
			if (!meta || !meta.path || !meta.focusPoint || !meta.name) {
				console.log('ℹ️ - ImageExporter: Missing meta data (path, focusPoint, or name). Skipping.', meta);
				return null;
			}


			// validate export configuration exists
			if (!meta.export || !meta.export.sizes) {
				console.log('ℹ️ - ImageExporter: Missing export sizes configuration. Skipping.', meta.export);
				return null;
			}

			// Calculate previous extension safely
			const previousExtension = (metaBefore && metaBefore.name) ? path.extname(metaBefore.name) : null;
			let currentExtension = path.extname(meta.name);

			// if (!currentExtension) currentExtension = await getImageExtensionFromUrl();


			console.log('previousExtension =', previousExtension);
			console.log('currentExtension =', currentExtension);

			for (const sSizeName in meta.export.sizes)
			{
				const [width, height] = meta.export.sizes[sSizeName].split('x').map(Number);

				// Create image processing request
				const exportRequest = {
					image: {
						focusPoint: meta.focusPoint,
						originalFile: meta.path + '/original' + currentExtension,
						size: {
							name: sSizeName,
							width: width,
							height: height
						},
						exportDestination: meta.path + '/' + sSizeName,
						previousExtension: previousExtension
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
			if (metaBefore && metaBefore.name && currentExtension !== previousExtension) {
				const originalPath = meta.path + '/original' + previousExtension;
				// Delete from Storage instead of Realtime Database
				const bucket = classRoot._admin.storage().bucket();
				await bucket.file(originalPath).delete().catch(error => {
					if (error.code !== 404) {
						console.error(`Error deleting previous original file ${originalPath}:`, error);
					} else {
						console.log(`Previous original file ${originalPath} not found for deletion (normal if extension changed).`);
					}
				});
			}

			return null;
		});
	}

	async exportImage(data, key = null)
	{
		// console.log('🌱🌱🌱 - handleImageExportRequest - data:', data);


		// handleImageExportRequest - data: {
		// 	id: '-OL-hHl0p5gwv7H0U013',
		// 	exportDestination: 'articles_components_draft/-OKfR4Ts8edc_LKiYhQy/image/tablet',
		// 	focusPoint: { x: 0.5, y: 0.5 },
		// 	path: 'articles_components_draft/-OKfR4Ts8edc_LKiYhQy/image/hero_lips.png',
		// 	size: '1024x400',
		// 	status: 'todo'
		// }


		const { focusPoint:imageFocusPoint, originalFile:imageOriginalFile, size:imageSize, exportDestination:imageExportDestination, previousExtension:previousExtension } = data.image;


		// console.log('focusPoint =', imageFocusPoint);
		// console.log('originalFile =', imageOriginalFile);
		// console.log('size =', imageSize);
		// console.log('exportDestination =', imageExportDestination);
		// console.log('previousExtension =', previousExtension);



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

		const originalImageSharp = sharp(tempFilePath); // Use the original image path for input
		const metadata = await originalImageSharp.metadata();

		const originalWidth = metadata.width;
		const originalHeight = metadata.height;
		const originalAspectRatio = originalWidth / originalHeight;

		let targetWidth = imageSize.width;
		let targetHeight = imageSize.height;

		let resizeWidth, resizeHeight;
		let needsCrop = false;
		let cropDetails = {};

		if (targetWidth > 0 && targetHeight > 0) {
			// --- Logic for fixed dimensions (Resize to cover, then crop) ---
			needsCrop = true;
			const targetAspectRatio = targetWidth / targetHeight;

			// Determine resize dimensions to cover the target size
			if (originalAspectRatio > targetAspectRatio) {
				// Original image is wider than the target aspect ratio
				resizeWidth = Math.round(targetHeight * originalAspectRatio);
				resizeHeight = targetHeight;
			} else {
				// Original image is taller than or equal to the target aspect ratio
				resizeWidth = targetWidth;
				resizeHeight = Math.round(targetWidth / originalAspectRatio);
			}

			// Calculate crop details relative to the *resized* image dimensions
			const cropWidth = targetWidth; // Final width is the target width
			const cropHeight = targetHeight; // Final height is the target height

			// Calculate crop origin (top-left corner) based on the resized image dimensions
			const cropX = Math.max(0, Math.min(resizeWidth - cropWidth, Math.floor((focalX * resizeWidth) - cropWidth / 2)));
			const cropY = Math.max(0, Math.min(resizeHeight - cropHeight, Math.floor((focalY * resizeHeight) - cropHeight / 2)));

			cropDetails = { left: cropX, top: cropY, width: cropWidth, height: cropHeight };

		} else if (targetWidth > 0 && targetHeight === 0) {
			// --- Resize by width, maintaining aspect ratio ---
			resizeWidth = targetWidth;
			resizeHeight = Math.round(targetWidth / originalAspectRatio);
			needsCrop = false;

		} else if (targetWidth === 0 && targetHeight > 0) {
			// --- Resize by height, maintaining aspect ratio ---
			resizeHeight = targetHeight;
			resizeWidth = Math.round(targetHeight * originalAspectRatio);
			needsCrop = false;

		} else { // targetWidth === 0 && targetHeight === 0
			// --- Use original dimensions (no resize) ---
			resizeWidth = originalWidth;
			resizeHeight = originalHeight;
			needsCrop = false;
		}


		// --- Process Image ---
		const finalProcessedPath = path.join(os.tmpdir(), `${filePathWithoutExtension}/${imageSize.name}-final${extension}`); // Path for the final output image
		await fs.mkdir(path.dirname(finalProcessedPath), { recursive: true }); // Ensure directory exists

		let sharpProcessor = originalImageSharp.resize(resizeWidth, resizeHeight); // Start processing chain with resize

		if (needsCrop) {
			sharpProcessor = sharpProcessor.extract(cropDetails); // Add crop operation if needed
		}

		await sharpProcessor.toFile(finalProcessedPath); // Write the final image to the temporary path


		// --- Upload the processed image ---
		await bucket.upload(finalProcessedPath, { // Upload from the final processed temporary path
			destination: resizedPath,
			metadata: {
				contentType: `image/${extension.slice(1)}`,
				metadata: {
					'Content-Disposition': 'inline'
				}
			}
		});

		// Get the file reference and set metadata
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

		// Get the current URL from the exportDestination
		const currentUrlSnapshot = await this._realtimeDatabase.ref(imageExportDestination).once('value');
		const currentUrl = currentUrlSnapshot.val();

		if (currentUrl)
		{
			// Extract the file path from the current URL
			const currentFilePath = this._extractFileName(currentUrl, isEmulator, bucket);

			// Avoid deleting the file we just uploaded if the URL points to the same path
			if (currentFilePath && currentFilePath !== resizedPath) { 
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

		// Set the new URL in the Realtime Database
		await this._realtimeDatabase.ref(imageExportDestination).set(url);


		// --- Clean up temporary files ---
		try {
			// Delete the original downloaded file
			await fs.access(tempFilePath);
			await fs.unlink(tempFilePath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				console.error(`Error deleting original temp file ${tempFilePath}:`, error);
			}
		}

		try {
			// Delete the final processed temporary file
			await fs.access(finalProcessedPath); 
			await fs.unlink(finalProcessedPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				console.error(`Error deleting final processed temp file ${finalProcessedPath}:`, error);
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

	//
	// async getImageExtensionFromUrl(imageUrl) {
	// 	try {
	// 		// Try HEAD request first (lighter)
	// 		let response;
	// 		try {
	// 			response = await axios.head(imageUrl, { maxRedirects: 5 });
	// 		} catch (err) {
	// 			if (err.response && err.response.status === 405) {
	// 				// Some servers don't allow HEAD; fall back to GET
	// 				response = await axios.get(imageUrl, {
	// 					maxRedirects: 5,
	// 					responseType: 'stream', // prevents full image download
	// 				});
	// 			} else {
	// 				throw err;
	// 			}
	// 		}
	//
	// 		const contentType = response.headers['content-type']; // e.g. "image/jpeg"
	// 		const extension = mime.extension(contentType);        // e.g. "jpg"
	//
	// 		if (!extension) {
	// 			throw new Error(`Could not determine extension from content-type: ${contentType}`);
	// 		}
	//
	// 		return extension;
	//
	// 	} catch (error) {
	// 		console.error(`Error getting extension for ${imageUrl}:`, error.message);
	// 		throw error;
	// 	}
	// }

}

module.exports = ImageExporter;