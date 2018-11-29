'use babel';

let http = require('http');
let fs = require('fs');
let os = require('os');

export default class Client {
    constructor(settings) {
        this.settings = settings;
    }

    install() {
        if (!fs.existsSync(this.settings.path())) {
            fs.mkdirSync(this.settings.path(), {recursive: true});
        }

        let jarFile = fs.createWriteStream(this.jar());
        http.get(this.remote(), (response) => {
            response.pipe(jarFile);
        });
    }

    jar() {
        return `${this.settings.path()}/serenade-client-${this.settings.version()}.jar`
    }

    remote() {
        return `http://cdn.serenade.ai/client/serenade-client-${this.settings.version()}.jar`
    }

    run() {
    }
}
