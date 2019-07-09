'use babel';

import fs from 'fs';
import http from 'http';
import https from 'https';
import kill from 'tree-kill';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import { fork, spawn } from 'child_process';
import targz from 'targz';

export default class BaseRunner {
    constructor(state, settings) {
        this.state = state;
        this.settings = settings;
        this.shouldUpdateUI = true;

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
        return '3a257bc174890aaa323ec49b0e0fc7b4';
    }

    clientUrl() {
        return `https://cdn.serenade.ai/client/Serenade-${this.clientVersion()}.tar.gz`;
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

        const file = fs.createWriteStream(archive);
        https.get(url, response => {
            let downloaded = 0;
            const length = response.headers['content-length'];
            let total = 0;
            if (length !== undefined) {
                total = parseInt(length, 10);
            }

            response.on('data', data => {
                downloaded += data.length;
                if (this.shouldUpdateUI) {
                    this.state.set('status', `${status} (${Math.min(100, Math.floor((100 * downloaded) / total))}%)\n`);
                    this.shouldUpdateUI = false;
                    setTimeout(() => {
                        this.shouldUpdateUI = true;
                    }, 500);
                }
            });

            response.pipe(file);
            file.on('finish', () => {
                targz.decompress(
                    {
                        src: archive,
                        dest: base
                    },
                    _err => {
                        fs.unlinkSync(archive);
                        if (callback) {
                            callback();
                        }
                    }
                );
            });
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
            'client/serenade.tar.gz',
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
