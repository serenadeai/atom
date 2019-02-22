'use babel';

import fs from 'fs';
import mkdirp from 'mkdirp'
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import { fork, spawn } from 'child_process';

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

    downloadAndDecompress(url, version, archive, status, callback) {
        archive = `${this.settings.path()}/${archive}`;
        let base = path.dirname(archive);
        if (fs.existsSync(`${base}/${version}`)) {
            if (callback) {
                callback();
            }

            return;
        }

        rimraf.sync(base);
        mkdirp.sync(base);

        // run the downlaoad in a separate process to fix a crazy issue where running a spawn in shell mode
        // wasn't working
        let downloader = fork(`${path.dirname(__filename)}/download.js`, [url, archive, status], {'silent': true});
        downloader.on('message', (data) => {
            this.state.set('status', data.toString());
        });
        downloader.on('close', () => {
            if (callback) {
                callback();
            }
        });
        downloader.stdout.on('data', (e) => {
            console.log(e.toString());
        });
        downloader.stderr.on('data', (e) => {
            console.log(e.toString());
        });
    }

    installAndRun() {
        if (this.settings.disableAutostart()) {
            return;
        }

        this.state.set('controlsEnabled', false);
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

                this.state.set('status', 'Ready');
                this.state.set('controlsEnabled', true);
            });
        });
    }

    installClient(callback) {
        this.downloadAndDecompress(
            this.clientUrl(),
            this.clientVersion(),
            'client/Serenade.zip',
            'Updating',
            callback
        );
    }

    installJdk(callback) {
        this.downloadAndDecompress(
            this.jdkUrl(),
            this.jdkVersion(),
            'jdk/jdk.tar.gz',
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
