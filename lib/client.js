'use babel';

let http = require('http');
let fs = require('fs');
let os = require('os');
let { spawn } = require('child_process');

export default class Client {
    constructor(settings) {
        this._process = null;
        this.settings = settings;

        // install and run process
        process.on('exit', () => {
            this.kill();
        });
    }

    _jar() {
        return `${this.settings.path()}/${this._jarFile()}`;
    }

    _jarFile() {
        return `serenade-client-${this.settings.version()}-all.jar`
    }

    _remote() {
        return `http://cdn.serenade.ai/client/${this._jarFile()}`;
    }

    autorun() {
        if (!this.settings.autostart()) {
            return;
        }

        this.run();
    }

    install(callback) {
        if (fs.existsSync(this._jar())) {
            callback();
            return;
        }

        let path = fs.createWriteStream(this._jar());
        http.get(this._remote(), (response) => {
            let stream = response.pipe(path);
            stream.on('finish', () => {
                stream.close();
                callback();
            });
        });
    }

    kill() {
        if (this._process) {
            this._process.kill();
            this._process = null;
        }
    }

    run() {
        this.kill();
        this.install(() => {
            this._process = spawn('java', ['-Dapple.awt.UIElement="true"', '-jar', this._jar()], {
                shell: true
            });
        });
    }
}
