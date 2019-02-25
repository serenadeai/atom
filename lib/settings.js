'use babel';

import fs from 'fs';
import mkdirp from 'mkdirp'
import os from 'os';

export default class Settings {
    constructor() {
        this.data = {};
        this.loaded = false;
    }

    _file() {
        return `${this.path()}/settings.json`;
    }

    _load() {
        if (this.loaded) {
            return;
        }

        mkdirp.sync(this.path());
        this.data = this.defaults();
        if (!fs.existsSync(this._file())) {
            return;
        }

        let fromFile = JSON.parse(fs.readFileSync(this._file()));
        for (let k of Object.keys(fromFile)) {
            this.data[k] = fromFile[k];
        }

        this.loaded = true;
    }

    disableAutostart() {
        this._load();
        return !!this.data.disable_autostart;
    }

    defaults() {
        return {
            disable_autostart: false,
            ignore: ['\.git/', '\.gradle/', '\.pyc$', '\.class$', '\.jar$', '\.dylib$'],
            token: ''
        };
    }

    ignore() {
        this._load();
        return this.data.ignore;
    }

    path() {
        return `${os.homedir()}/.serenade`;
    }

    save() {
        mkdirp.sync(this.path());
        fs.writeFileSync(this._file(), JSON.stringify(this.data));
    }

    setToken(token) {
        this.data.token = token;
        this.save();
    }

    token() {
        this._load();
        return this.data.token;
    }
}
