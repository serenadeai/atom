'use babel';

import decompress from 'decompress';
import fs from 'fs';
import mkdirp from 'mkdirp'
import os from 'os';
import progress from 'request-progress';
import request from 'request';
import rimraf from 'rimraf';
import { spawn } from 'child_process';

export default class BaseRunner {
    constructor(state, settings) {
        this.state = state;
        this.settings = settings;

        this._process = null;
        process.on('exit', () => {
            this.kill();
        });
    }

    jdkBinary() {
        throw new Error('Not implemented');
    }

    jdkUrl() {
        throw new Error('Not implemented');
    }

    jdkVersion() {
        throw new Error('Not implemented');
    }

    clientVersion() {
        return '21d0570c4f67d0cef547d0b9da674ba4';
    }

    clientUrl() {
        return `https://cdn.serenade.ai/client/Serenade-${this.clientVersion()}.zip`;
    }

    downloadAndDecompress(url, directory, version, tmp, status, callback) {
        let base = `${this.settings.path()}/${directory}`;
        if (fs.existsSync(`${base}/${version}`)) {
            if (callback) {
                callback();
            }
            return;
        }

        rimraf.sync(base);
        mkdirp.sync(base);
        let archive = `${base}/${tmp}`;
        progress(request(url)).on('progress', (state) => {
            this.state.set('status', `${status} (${Math.floor(state.percent * 100)}%)`);
        }).on('end', () => {
            console.log('start decompress');
            decompress(archive, base).then(() => {
                console.log('decompress done');
                fs.unlinkSync(archive);
                if (callback) {
                    callback();
                }
            });
        }).pipe(fs.createWriteStream(archive));
    }

    installAndRun(callback) {
        if (this.settings.disableAutostart()) {
            callback();
            return;
        }

        this.installJdk(() => {
            this.installClient(() => {
                let java = `${this.settings.path()}/jdk/${this.jdkVersion()}/${this.jdkBinary()}`;
                this._process = spawn(java, [
                    '-Dapple.awt.UIElement="true"',
                    '-jar',
                    `${this.settings.path()}/client/${this.clientVersion()}/serenade.jar`
                ], {
                    shell: true
                });

                if (callback) {
                    callback();
                }
            });
        });
    }

    installClient(callback) {
        this.downloadAndDecompress(
            this.clientUrl(),
            'client',
            this.clientVersion(),
            'Serenade.zip',
            'Updating',
            callback
        );
    }

    installJdk(callback) {
        this.downloadAndDecompress(
            this.jdkUrl(),
            'jdk',
            this.jdkVersion(),
            'jdk.tar.gz',
            'Installing',
            callback
        );
    }

    kill() {
        if (this._process) {
            this._process.kill();
            this._process = null;
        }
    }
}
