'use babel';

import decompress from 'decompress';
import fs from 'fs';
import mkdirp from 'mkdirp'
import os from 'os';
import progress from 'request-progress';
import request from 'request';
import { spawn } from 'child_process';

export default class Client {
    constructor(delegate, settings) {
        this.delegate = delegate;
        this.settings = settings;

        // install and run process
        this._process = null;
        process.on('exit', () => {
            this.kill();
        });
    }

    _path() {
        return `${this.settings.path()}/client/${this.settings.version()}`;
    }

    _remote() {
        return `https://cdn.serenade.ai/client/Serenade-${this.settings.version()}.app.zip`;
    }

    autorun(callback) {
        if (this.settings.disableAutostart()) {
            callback();
            return;
        }

        this.run(callback);
    }

    install(callback) {
        if (fs.existsSync(`${this._path()}/Serenade.app`)) {
            callback();
            return;
        }

        // download compressed app file
        mkdirp.sync(this._path());
        let zip = `${this._path()}/Serenade.app.zip`;
        this.delegate.alternativesPanel.updateStatus('Updating (0%)');
        progress(request(this._remote())).on('progress', (state) => {
            this.delegate.alternativesPanel.updateStatus(`Updating (${Math.floor(state.percent * 100)}%)`);
        }).on('end', () => {
            // unzip client to the root settings path
            decompress(zip, this._path()).then(() => {
                this.delegate.alternativesPanel.updateStatus('Ready');
                fs.unlinkSync(zip);
                callback();
            });
        }).pipe(fs.createWriteStream(zip));
    }

    kill() {
        if (this._process) {
            this._process.kill();
            this._process = null;
        }
    }

    run(callback) {
        this.kill();
        this.install(() => {
            this._process = spawn(`${this._path()}/Serenade.app/Contents/MacOS/Serenade`);
            callback();
        });
    }
}
