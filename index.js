const co = require('co');
const fs = require('fs');
const plist = require('plist');
const sharp = require('sharp');

const getIntArray = function (str) {
    return str.replace(/[^\-?(0-9)]+/ig, ' ').trim().split(' ').map((s) => {
        return parseInt(s);
    });
};

const parseFrame = function (frame, format) {
    let frameInfo = {};
    if (format == 1 || format == 2) {
        frameInfo.rotated = frame.rotated;
        frameInfo.frame = getIntArray(frame.frame);
        frameInfo.offset = getIntArray(frame.offset);
        frameInfo.sourceSize = getIntArray(frame.sourceSize);
    } else if (format == 3) {
        console.log(frame);
        frameInfo.rotated = frame.textureRotated;
        frameInfo.frame = getIntArray(frame.textureRect);
        frameInfo.offset = getIntArray(frame.spriteOffset);
        frameInfo.sourceSize = getIntArray(frame.spriteSourceSize);
    }
    return frameInfo;
};

const unpack = co.wrap(function* (plistPath, outputDir) {
    if (outputDir == null) {
        outputDir = plistPath.substring(0, plistPath.lastIndexOf('.'));
    }
    if (fs.existsSync(outputDir) == false) {
        fs.mkdirSync(outputDir);
    }
    let fileContent = fs.readFileSync(plistPath, 'utf-8');
    let parsedFile = plist.parse(fileContent);
    let frames = parsedFile.frames;
    let metadata = parsedFile.metadata;

    let format = metadata.format;

    let imgPath = plistPath.substring(0, plistPath.lastIndexOf('/') + 1) + metadata.textureFileName;

    for (let frameName in frames) {
        let frame = frames[frameName];
        let frameInfo = parseFrame(frame, format);
        console.log(frameInfo);
        let imgSharp = sharp(imgPath);
        let [left, top, width, height] = frameInfo.frame;
        let [srcWidth, srcHeight] = frameInfo.sourceSize;
        let [offsetX, offsetY] = frameInfo.offset;
        if (frameInfo.rotated) {
            let t = width;
            width = height;
            height = t;
        }

        imgSharp = imgSharp.extract({
            left: left,
            top: top,
            width: width,
            height: height
        });
        if (frameInfo.rotated) {
            imgSharp = imgSharp.rotate(-90);
        }
        imgSharp.toBuffer().then((imgBuffer) => {
            sharp({
                create: {
                    width: srcWidth, height: srcHeight, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}
                }
            }).png().overlayWith(imgBuffer, {
                top: srcHeight / 2 - height / 2 + offsetY,
                left: srcWidth / 2 - width / 2 + offsetX
            }).toFile(`${outputDir}/${frameName}`);
        });


    }
});

co(function* () {
    let options = process.argv;
    let plistPath = options[2];
    let outputDir = options[3];
    yield unpack(plistPath, outputDir);
});