'use babel';

let os = require('os');

export default class Settings {
    path() {
        return `${os.homedir()}/.serenade`;
    }

    version() {
        return '860a7ce5499caf0c7dc3f315446a3056b37ce31d';
    }
}
