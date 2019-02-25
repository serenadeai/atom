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

        this.data = {};
        mkdirp.sync(this.path());
        if (!fs.existsSync(this._file())) {
            return;
        }

        this.data = JSON.parse(fs.readFileSync(this._file()));
        this.loaded = true;
    }

    defaults() {
        return {
            disable_autostart: false,
            ignore: ['\.git/', '\.gradle/', '\.pyc$', '\.class$', '\.jar$', '\.dylib$'],
            token: ''
        };
    }

    get(key) {
        this._load();
        if (this.data[key] === undefined) {
            return this.defaults()[key];
        }

        return this.data[key];
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
}
