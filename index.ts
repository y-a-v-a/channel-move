import gd = require("node-gd");
const fs = require('fs');
const path = require('path');

const TARGET_DIR: string = './tmp';

/**
 * @returns A random number between 5 and 20
 */
function createThreshold() {
  return Math.round(Math.random() * 15) + 5;
}

/**
 * If a value is out of bound of 0 to limit,
 * remap it at beginning or end of sequence
 * @param xy Reference coordinate value
 * @param limit Limit to test against
 * @param threshold Threshold or offset
 * @returns
 */
function referencePixel(xy: number, limit: number, threshold: number) {
  let returnValue: number;

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
 * @param fileName The name of the file to open
 * @returns The image that has been opened
 */
async function openJpeg(fileName: string) {
  return await new Promise<gd.Image>(async (resolve, reject) => {
    const image = await gd.openJpeg(fileName);
    resolve(image);
  }).catch(reason => {
    throw new Error(reason);
  });
}

/**
 * Save gd.Image data as jpeg image
 * @param filePath The path and name of the file where to store it
 * @param quality Jpeg compression quality between 0 and 100
 * @param imageData The Jpeg image data to store
 * @returns true when save was succesful
 */
async function saveJpeg(filePath: string, quality: number, imageData: gd.Image) {
  return await new Promise<boolean>(async (resolve, reject) => {
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
 * @param fileName The file name to match as jpeg
 * @returns Whether the fileName matched jp(e)g
 */
function isJpeg(fileName: string) {
  return fileName.match(/\.(jpe?g)$/);
}

/**
 * Read a directory for Jpeg files
 * @param dirName The directory to read from
 * @returns Absolute paths of found jpeg images
 */
async function readDir(dirName: string) {
  return new Promise<Array<string>>((resolve, reject) => {
    fs.readdir(dirName, (error: Error, files: Array<string>) => {
      if (error) {
        return reject(error);
      }

      const fullPaths = files.map((fileName: string) => {
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
 * @param filePath Absolute path to file we want to process
 * @returns
 */
async function processSourceJpeg(filePath: string) {
  const image: gd.Image = await openJpeg(filePath);

  let result: gd.Image = gd.createTrueColorSync(image.width, image.height);

  const thresholdR: number = createThreshold();
  const thresholdG: number = createThreshold();
  const thresholdB: number = createThreshold();

  for (let x:number = 0; x < image.width; x++) {
    for (let y: number = 0; y < image.height; y++) {
      let nextXR: number = referencePixel(x, image.width, thresholdR);
      let nextPixelR: number = image.getTrueColorPixel(nextXR, y);
      let channelRnext: number = image.red(nextPixelR);

      let nextYG: number = referencePixel(y, image.height, thresholdG);
      let nextPixelG: number = image.getTrueColorPixel(x, nextYG);
      let channelGnext: number = image.green(nextPixelG);

      let nextXB: number = referencePixel(x, image.width, -thresholdB);
      let nextPixelB: number = image.getTrueColorPixel(nextXB, y);
      let channelBnext: number = image.blue(nextPixelB);

      let color: number = gd.trueColor(channelRnext, channelGnext, channelBnext);
      result.setPixel(x, y, color);
    }
  }

  const fileTarget: string = createResultFileName(filePath);
  const isSaved: boolean = await saveJpeg(fileTarget, 80, result);

  if (isSaved) {
    console.log(`Created: ${fileTarget}`);
  } else {
    console.log(`Unable to create new image for ${fileTarget}`);
  }
}

/**
 * Create a target path to store the processed image to
 * @param fromOriginalAbsPath Absolute path to create target from
 * @returns Absolute path for the target
 */
function createResultFileName(fromOriginalAbsPath: string) {
  const fileName: string = fromOriginalAbsPath.split('/').pop() || '';
  const resultFileName: string = fileName.replace(/\.jpe?g$/, `-${Date.now()}.jpg`);
  return path.resolve(`${TARGET_DIR}/${resultFileName}`);
}

/**
 * Main function of this module
 */
async function main() {
  const sourceDir: string = `${__dirname}/../src`;
  const sourceFiles: Array<string> = await readDir(sourceDir);
  const imageList: Array<Promise<void>> = [];

  for(let i:number = 0; i < sourceFiles.length; i++) {
    imageList.push(processSourceJpeg(sourceFiles[i]));
  }

  Promise.all(imageList).then(() => {
    console.log('Done creating images');
  })
}

// run this little app...
main();
