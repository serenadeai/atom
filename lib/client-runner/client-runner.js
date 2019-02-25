'use babel';

import LinuxRunner from './linux-runner';
import MacRunner from './mac-runner';
import WindowsRunner from './windows-runner';

export default class ClientRunner {
    constructor(state, settings) {
        this.state = state;
        this.settings = settings;
        if (!this.settings.get('token')) {
            this.state.set('authenticated', false);
        }

        if (process.platform == 'darwin') {
            this.runner = new MacRunner(this.state, this.settings);
        }
        else if (process.platform == 'win32') {
            this.runner = new WindowsRunner(this.state, this.settings);
        }
        else {
            this.runner = new LinuxRunner(this.state, this.settings);
        }
    }

    getRunner() {
        return this.runner;
    }
}
