import App from './app';
import CommandHandler from './shared/command-handler';
import IPC from './shared/ipc';
import StateManager from './shared/state-manager';

export default class AtomIPC extends IPC {
    private app: App;

    constructor(app: App, state: StateManager, commandHandler: CommandHandler) {
        super(state, commandHandler);
        this.app = app;
    }

    beforeHandle() {
        this.app.setCurrentEditor();
    }
}
