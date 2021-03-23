const { createCanvas } = require('canvas');
var fs = require('fs');
const os = require('os');
const request = require('request');
const http = require('http');

var width = 600;
var height = 448;

function writeBMP24(buffer, width, height) {
    var extraBytes = width % 4;
    var rgbSize = height * (3 * width + extraBytes);
    var tempBuffer = Buffer.alloc(54 + rgbSize);

    var pos = 0;
    tempBuffer.write('BM', pos, 2); pos += 2;
    tempBuffer.writeUInt32LE(54 + rgbSize, pos); pos += 4;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;
    tempBuffer.writeUInt32LE(54, pos); pos += 4;
    tempBuffer.writeUInt32LE(40, pos); pos += 4;
    tempBuffer.writeUInt32LE(width, pos); pos += 4;
    tempBuffer.writeUInt32LE(height, pos); pos += 4;
    tempBuffer.writeUInt16LE(1, pos); pos += 2;
    tempBuffer.writeUInt16LE(24, pos); pos += 2;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;
    tempBuffer.writeUInt32LE(0, pos); pos += 4;

    var i = 0;
    var rowBytes = 3 * width + extraBytes;

    // top -> bottom --> bottom -> top
    for (var y = height; y > 0; y--) {
        for (var x = 0; x < width; x++) {
            var p = pos + y * rowBytes + x * 3;
            // BGRA -> BGR
            var orgB = buffer[i++];
            var orgG = buffer[i++];
            var orgR = buffer[i++];
            i++; //A

            tempBuffer[p] = orgB;
            tempBuffer[p + 1] = orgG;
            tempBuffer[p + 2] = orgR;
        }
        if (extraBytes > 0) {
            var fillOffset = pos + y * rowBytes + width * 3;
            tempBuffer.fill(0, fillOffset, fillOffset + extraBytes);
        }
    }
    return tempBuffer;
}

function doRequest(url) {
    let options = { json: true };
    return new Promise(function (resolve, reject) {
        request(url, options, function (error, res, body) {
            if (!error && res.statusCode == 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    });
}

async function renderQuote(ctx, w, h) {
    // background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // start
    var x = 20;
    var y = 20;

    let url = "https://type.fit/api/quotes";
    var body = await doRequest(url);
    var q = body[Math.floor(Math.random() * body.length)];
    //console.log(q);

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle';

    drawMultilineText(ctx, new Date().toLocaleDateString(), {
        rect: {
            x: 50,
            y: 5,
            width: w / 3,
            height: 20
        },
        font: 'Arial',
        verbose: false,
        lineHeight: 1,
        minFontSize: 10,
        maxFontSize: 20
    });

    drawMultilineText(ctx, 'Fetched at: ' + new Date().toLocaleTimeString(), {
        rect: {
            x: w - 60,
            y: 5,
            width: w / 3,
            height: 20
        },
        font: 'Arial',
        verbose: false,
        lineHeight: 1,
        minFontSize: 10,
        maxFontSize: 12
    });

    drawMultilineText(ctx, q.text, {
        rect: {
            x: w / 2,
            y: 0,
            width: w,
            height: h
        },
        font: 'Arial',
        verbose: false,
        lineHeight: 1,
        minFontSize: 24,
        maxFontSize: 50
    });

    drawMultilineText(ctx, q.author, {
        rect: {
            x: w / 2,
            y: h - 50,
            width: w,
            height: 50
        },
        font: 'Arial',
        verbose: false,
        lineHeight: 1,
        minFontSize: 15,
        maxFontSize: 30
    });

}

// https://stackoverflow.com/questions/6756975/draw-multi-line-text-to-canvas
function drawMultilineText(ctx, text, opts) {

    // Default options
    if (!opts)
        opts = {}
    if (!opts.font)
        opts.font = 'sans-serif'
    if (typeof opts.stroke == 'undefined')
        opts.stroke = false
    if (typeof opts.verbose == 'undefined')
        opts.verbose = false
    if (!opts.rect)
        opts.rect = {
            x: 0,
            y: 0,
            width: ctx.canvas.width,
            height: ctx.canvas.height
        }
    if (!opts.lineHeight)
        opts.lineHeight = 1.1
    if (!opts.minFontSize)
        opts.minFontSize = 30
    if (!opts.maxFontSize)
        opts.maxFontSize = 100
    // Default log function is console.log - Note: if verbose il false, nothing will be logged anyway
    if (!opts.logFunction)
        opts.logFunction = function (message) { console.log(message) }


    const words = require('words-array')(text)
    if (opts.verbose) opts.logFunction('Text contains ' + words.length + ' words')
    var lines = []
    let y;  //New Line

    let lastFittingLines;                       // declaring 4 new variables (addressing issue 3)
    let lastFittingFont;
    let lastFittingY;
    let lastFittingLineHeight;
    for (var fontSize = opts.minFontSize; fontSize <= opts.maxFontSize; fontSize++) {

        // Line height
        var lineHeight = fontSize * opts.lineHeight

        // Set font for testing with measureText()
        ctx.font = ' ' + fontSize + 'px ' + opts.font

        // Start
        var x = opts.rect.x;
        y = lineHeight; //modified line        // setting to lineHeight as opposed to fontSize (addressing issue 1)
        lines = []
        var line = ''

        // Cycles on words


        for (var word of words) {
            // Add next word to line
            var linePlus = line + word + ' '
            // If added word exceeds rect width...
            if (ctx.measureText(linePlus).width > (opts.rect.width)) {
                // ..."prints" (save) the line without last word
                lines.push({ text: line, x: x, y: y })
                // New line with ctx last word
                line = word + ' '
                y += lineHeight
            } else {
                // ...continues appending words
                line = linePlus
            }
        }

        // "Print" (save) last line
        lines.push({ text: line, x: x, y: y })

        // If bottom of rect is reached then breaks "fontSize" cycle

        if (y > opts.rect.height)
            break;

        lastFittingLines = lines;               // using 4 new variables for 'step back' (issue 3)
        lastFittingFont = ctx.font;
        lastFittingY = y;
        lastFittingLineHeight = lineHeight;

    }

    lines = lastFittingLines;                   // assigning last fitting values (issue 3)                    
    ctx.font = lastFittingFont;
    if (opts.verbose) opts.logFunction("Font used: " + ctx.font);
    const offset = opts.rect.y - lastFittingLineHeight / 2 + (opts.rect.height - lastFittingY) / 2;     // modifying calculation (issue 2)
    for (var line of lines)
        // Fill or stroke
        if (opts.stroke)
            ctx.strokeText(line.text.trim(), line.x, line.y + offset) //modified line
        else
            ctx.fillText(line.text.trim(), line.x, line.y + offset) //modified line

    // Returns font size
    return fontSize
}

http.createServer(async function (request, response) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    await renderQuote(ctx, width, height);

    if (os.endianness() !== 'LE') {
        console.log('ERROR: canvas.toBuffer will use different byte order. FIXME :P ');
        return;
    }

    var b = writeBMP24(canvas.toBuffer('raw'), width, height);

    response.writeHead(200, {
        'Content-Type': 'image/bmp',
        'Content-Length': b.length
    });

    response.write(b, () => {
        response.end();
    });
}).listen(process.env.NODE_PORT || 2000);
