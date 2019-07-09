'use babel';

import fs from 'fs';
import mkdirp from 'mkdirp'
import os from 'os';

export default class Settings {
    _defaults() {
        return {
            disable_autostart: false,
            ignore: ['\.git/', '\.gradle/', '\.pyc$', '\.class$', '\.jar$', '\.dylib$'],
            token: ''
        };
    }

    _file() {
        return `${this.path()}/settings.json`;
    }

    _load() {
        this._data = {};
        mkdirp.sync(this.path());
        if (!fs.existsSync(this._file())) {
            return;
        }

        this._data = JSON.parse(fs.readFileSync(this._file()));
    }

    _save() {
        mkdirp.sync(this.path());
        fs.writeFileSync(this._file(), JSON.stringify(this._data));
    }

    get(key) {
        this._load();
        if (this._data[key] === undefined) {
            return this._defaults()[key];
        }

        return this._data[key];
    }

    path() {
        return `${os.homedir()}/.serenade`;
    }

    set(key, value) {
        this._load();
        this._data[key] = value;
        this._save();
    }
}
