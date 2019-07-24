import App from './app';
import ClientRunner from './shared/client-runner/base-runner';
import CommandHandler from './shared/command-handler';
import IPC from './shared/ipc';
import StateManager from './shared/state-manager';

export default class AtomIPC extends IPC {
    private app: App;

    constructor(app: App, state: StateManager, commandHandler: CommandHandler, clientRunner: ClientRunner) {
        super(state, commandHandler, clientRunner, 'Atom');
        this.app = app;
    }

    beforeHandle() {
        this.app.setCurrentEditor();
    }
}
