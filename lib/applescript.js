'use babel';

import { spawn } from 'child_process';

export default class Applescript {
    static type(text) {
        const script = 'tell application "System Events"\nkeystroke "' + text + '"\nend tell'
        spawn('osascript', ['-e', script]);
    }
}
