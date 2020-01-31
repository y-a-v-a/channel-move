const gd = require('node-gd');
const fs = require('fs');
const path = require('path');

const TARGET_DIR = './tmp';

/**
 * @returns {number} A random number between 5 and 20
 */
function createThreshold() {
  return Math.round(Math.random() * 15) + 5;
}

/**
 * If a value is out of bound of 0 to limit,
 * remap it at beginning or end of sequence
 * @param {number} xy Reference coordinate value
 * @param {number} limit Limit to test against
 * @param {number} threshold Threshold or offset
 * @returns {number}
 */
function referencePixel(xy, limit, threshold) {
  let returnValue;

  // 95 + 10 > 100 ? 5
  if (xy + threshold > limit) {
    returnValue = xy + threshold - limit;
  // 5 +- 10 < 0 ? 95
  } else if (xy + threshold < 0) {
    returnValue = xy + threshold + limit;
  // 90 + 10 ? 100
  } else {
    returnValue = xy + threshold;
  }
  return returnValue;
}

/**
 * Open a Jpeg file
 * @param {String} fileName The name of the file to open
 * @returns {Promise<Object>} The image that has been opened
 */
async function openJpeg(fileName) {
  return await new Promise(async (resolve, reject) => {
    const image = await gd.openJpeg(fileName);
    resolve(image);
  }).catch(reason => {
    throw new Error(reason);
  });
}

/**
 * Save gd.Image data as jpeg image
 * @param {String} filePath The path and name of the file where to store it
 * @param {Number} quality Jpeg compression quality between 0 and 100
 * @param {Object} imageData The Jpeg image data to store
 * @returns {Promise<boolean>} true when save was succesful
 */
async function saveJpeg(filePath, quality, imageData) {
  return await new Promise(async (resolve, reject) => {
    const success = await imageData.saveJpeg(filePath, quality);
    if (success) {
      resolve(true);
    } else {
      reject(false);
    }
  }).catch(reason => {
    throw new Error(reason);
  });
}

/**
 * Check if file extension is .jpg
 * @param {string} fileName The file name to match as jpeg
 * @returns {boolean} Whether the fileName matched jp(e)g
 */
function isJpeg(fileName) {
  return fileName.match(/\.(jpe?g)$/);
}

/**
 * Read a directory for Jpeg files
 * @param {string} dirName The directory to read from
 * @returns {Promise<Array<string>>} Absolute paths of found jpeg images
 */
async function readDir(dirName) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirName, (error, files) => {
      if (error) {
        return reject(error);
      }

      const fullPaths = files.map(fileName => {
        return path.resolve(`${dirName}/${fileName}`);
      });

      resolve(fullPaths.filter(isJpeg));
    });
  }).catch(reason => {
    throw new Error(reason);
  });
}

/**
 * Read image data and move color channels around
 * @param {string} filePath Absolute path to file we want to process
 * @returns {Promise<void>}
 */
async function processSourceJpeg(filePath) {
  const image = await openJpeg(filePath);

  let result = gd.createTrueColorSync(image.width, image.height);

  const thresholdR = createThreshold();
  const thresholdG = createThreshold();
  const thresholdB = createThreshold();

  for(let x = 0; x < image.width; x++) {
    for(let y = 0; y < image.height; y++) {
      let nextXR = referencePixel(x, image.width, thresholdR);
      let nextPixelR = image.getTrueColorPixel(nextXR, y);
      let channelRnext = image.red(nextPixelR);

      let nextYG = referencePixel(y, image.height, thresholdG);
      let nextPixelG = image.getTrueColorPixel(x, nextYG);
      let channelGnext = image.green(nextPixelG);

      let nextXB = referencePixel(x, image.width, -thresholdB);
      let nextPixelB = image.getTrueColorPixel(nextXB, y);
      let channelBnext = image.blue(nextPixelB);

      let color = gd.trueColor(channelRnext, channelGnext, channelBnext);
      result.setPixel(x, y, color);
    }
  }

  const fileTarget = createResultFileName(filePath);
  const isSaved = saveJpeg(fileTarget, 100, result);

  if (isSaved) {
    console.log(`Created: ${fileTarget}`);
  } else {
    console.log(`Unable to create new image for ${fileName}`);
  }
}

/**
 * Create a target path to store the processed image to
 * @param {string} fromOriginalAbsPath Absolute path to create target from
 * @returns {string} Absolute path for the target
 */
function createResultFileName(fromOriginalAbsPath) {
  const fileName = fromOriginalAbsPath.split('/').pop();
  const resultFileName = fileName.replace(/\.jpe?g$/, `-${Date.now()}.jpg`);
  return path.resolve(`${TARGET_DIR}/${resultFileName}`);
}

/**
 * Main function of this module
 */
async function main() {
  const sourceDir = `${__dirname}/src`;
  const sourceFiles = await readDir(sourceDir);

  sourceFiles.map(processSourceJpeg);
}

// run this little app...
main();
