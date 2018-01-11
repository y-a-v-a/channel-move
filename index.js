const gd = require('node-gd');

const thresholdR = Math.round(Math.random() * 15) + 5;
const thresholdG = Math.round(Math.random() * 15) + 5;
const thresholdB = Math.round(Math.random() * 15) + 5;

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

gd.openJpeg('./image8.jpg', (error, image) => {
  console.log(error, image);

  let result = gd.createTrueColorSync(image.width, image.height);

  for(let x = 0; x < image.width; x++) {
    for(let y = 0; y < image.height; y++) {
      let pixel = image.getTrueColorPixel(x, y);
      let channelR = image.red(pixel);
      let channelG = image.green(pixel);
      let channelB = image.blue(pixel);

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

  result.saveJpeg(`./test${Date.now()}.jpg`, 100, (error) => {
    if (error) {
      console.log(error);
    }
  });
});
