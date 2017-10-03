'use babel';

import { spawn } from 'child_process';

export default class Applescript {
    static _execute(command) {
        const script = 'tell application "System Events"\n' + command + '\nend tell'
        spawn('osascript', ['-e', script]);
    }

    static keycodes(codes) {
        let commands = {
            'enter': 36,
            'left': 123,
            'right': 124,
            'down': 125,
            'up': 126
        };

        let command = '';
        for (let code of codes) {
            command += 'key code ' + commands[code] + '\n';
        }

        return Applescript._execute(command);
    }

    static type(text) {
        return Applescript._execute('keystroke "' + text + '"');
    }
}
