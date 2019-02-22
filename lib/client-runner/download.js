const decompress = require('decompress');
const fs = require('fs');
const path = require('path');
const progress = require('request-progress');
const request = require('request');

let url = process.argv[2];
let archive = process.argv[3];
let status = process.argv[4];

progress(request(url)).on('progress', (state) => {
    process.send(`${status} (${Math.floor(state.percent * 100)}%)\n`);
}).on('end', () => {
    decompress(archive, path.dirname(archive)).then(() => {
        fs.unlinkSync(archive);
    });
}).pipe(fs.createWriteStream(archive));
