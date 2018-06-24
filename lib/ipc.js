'use babel';

import http from 'http';
import CommandHandler from './command-handler';

export default class IPC {
    constructor(delegate) {
        this.server = null;
        this.commandHandler = new CommandHandler(delegate);
    }

    send(type, data) {
        let json = JSON.stringify({
            type: type,
            data: data
        });

        let request = http.request({
            host: 'localhost',
            port: 17373,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(json)
            }
        });

        request.write(json);
        request.end();
    }

    start() {
        this.server = http.createServer((request, response) => {
            let body = '';
            let result = {success: false};

            request.on('data', (data) => {
                body += data;
            });

            request.on('end', () => {
                let command = JSON.parse(body);

                // call the method on the command handler of the same name, and use that result
                if (command.type in this.commandHandler) {
                    result.success = true;
                    let commandResult = this.commandHandler[command.type](command.data);
                    if (commandResult) {
                        result = commandResult;
                    }
                }

                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify(result));
            });
        });

        this.server.listen(17374);
    }

    stop() {
        this.server.close();
    }
}
