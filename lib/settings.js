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

    disableAutostart() {
        this._load();
        return !!data.disable_autostart;
    }

    showListenControls() {
        this._load();
        return !!data.show_listen_controls;
    }

    ignore() {
        if (data.ignore === undefined) {
            return ['\.git/', '\.gradle/', '\.pyc$', '\.class$', '\.jar$', '\.dylib$'];
        }

        return data.ignore;
    }

    path() {
        return `${os.homedir()}/.serenade`;
    }

    version() {
        return '6102fab9b55dfffece6aac467a4ac87b';
    }
}
