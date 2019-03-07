'use babel';

import fs from 'fs';
import http from 'http';
import kill from 'tree-kill';
import mkdirp from 'mkdirp';
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

    _log(data) {
        let string = data.toString();
        if (string.startsWith('WARNING:')) {
            return;
        }

        console.log(string);
    }

    javaBinary() {
        throw new Error('Not implemented');
    }

    javaPath() {
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

    checkPort(callback) {
        let result = true;
        let server = http.createServer();
        server.once('error', function(error) {
            if (error.code === 'EADDRINUSE') {
                result = false;
            }
        });

        server.once('listening', function() {
            server.close();
        });

        setTimeout(() => {
            callback(result);
        }, 100);

        server.listen(17373);
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
    }

    installAndRun(callback) {
        if (this.settings.get('disable_autostart')) {
            callback();
            return;
        }

        this.state.set('installed', false);
        this.installJdk(() => {
            this.installClient(() => {
                this.checkPort((open) => {
                    // don't try to run the client twice. the IPC will show an error message to the user
                    if (!open) {
                        callback();
                        return;
                    }

                    this._process = spawn(this.javaBinary(), [
                        '--add-opens=java.base/java.nio=ALL-UNNAMED',
                        '--add-opens=java.base/java.lang=ALL-UNNAMED',
                        '-Dapple.awt.UIElement="true"',
                        '-jar',
                        `"${this.settings.path()}/client/${this.clientVersion()}/serenade.jar"`
                    ], {
                        cwd: `${this.settings.path()}/jdk/${this.jdkVersion()}/${this.javaPath()}`,
                        shell: true
                    });

                    this._process.stdout.on('data', this._log);
                    this._process.stderr.on('data', this._log);
                    callback();
                });
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
            // the tree-kill library doesn't seem reliable across platforms, so try both the native nodejs
            // pkill and the native library
            let pid = this._process.pid;
            this._process.kill();
            kill(this._process.pid);
        }
    }
}
