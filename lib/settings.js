'use babel';

import fs from 'fs';
import mkdirp from 'mkdirp'
import os from 'os';

export default class Settings {
    constructor() {
        this.data = {};
        this.loaded = false;
        mkdirp.sync(this.path());
    }

    _file() {
        return `${this.path()}/settings.json`;
    }

    _load() {
        if (this.loaded || !fs.existsSync(this._file())) {
            return;
        }

        data = JSON.parse(fs.readFileSync(this._file()));
    }

    autostart() {
        this._load();
        if (data.autostart === undefined) {
            return true;
        }

        return data.autostart;
    }

    autorecord() {
        this._load();
        if (data.autorecord === undefined) {
            return true;
        }

        return data.autorecord;
    }

    path() {
        return `${os.homedir()}/.serenade`;
    }

    version() {
        return '6102fab9b55dfffece6aac467a4ac87b';
    }
}
