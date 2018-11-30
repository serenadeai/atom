'use babel';

let fs = require('fs');
let os = require('os');

export default class Settings {
    constructor() {
        this.data = {};
        this.loaded = false;

        if (!fs.existsSync(this.path())) {
            fs.mkdirSync(this.path(), {recursive: true});
        }
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

    path() {
        return `${os.homedir()}/.serenade`;
    }

    version() {
        return 'b0ba4f5afb657a5ef9f615700b93902b';
    }
}
