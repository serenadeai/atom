'use babel';

import MacRunner from './mac-runner';
import WindowsRunner from './windows-runner';

export default class ClientRunner {
    constructor(state, settings) {
        this.state = state;
        this.settings = settings;

        if (process.platform == 'darwin') {
            this.runner = new MacRunner(this.state, this.settings);
        }
        else if (process.platform == 'win32') {
            this.runner = new WindowsRunner(this.state, this.settings);
        }
    }

    getRunner() {
        return this.runner;
    }
}
