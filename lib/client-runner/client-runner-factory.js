'use babel';

import LinuxRunner from './linux-runner';
import MacRunner from './mac-runner';
import WindowsRunner from './windows-runner';

export default class ClientRunnerFactory {
    constructor(state, settings) {
        this.state = state;
        this.settings = settings;
    }

    get() {
        if (process.platform == 'darwin') {
            return new MacRunner(this.state, this.settings);
        }
        else if (process.platform == 'win32') {
            return new WindowsRunner(this.state, this.settings);
        }
        else {
            return new LinuxRunner(this.state, this.settings);
        }
    }
}
