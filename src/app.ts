import * as Atom from 'atom';

import Alternatives from './alternatives';
import AlternativesPanel from './alternatives-panel';
import CommandHandler from './command-handler';
import DocsPanel from './docs-panel';
import AtomIPC from './ipc';
import BaseApp from './shared/app';
import ClientRunnerFactory from './shared/client-runner/client-runner-factory';
import Settings from './shared/settings';
import StateManager from './shared/state-manager';
import TranscriptInputView from './transcript-input-view';

export default class App extends BaseApp {
    currentEditor?: any;
    subscriptions?: Atom.CompositeDisposable;
    transcriptInputView?: TranscriptInputView;

    activate() {
        this.initialize();

        this.subscriptions = new Atom.CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade:initialize': () => this.initialize(),
            'serenade:show-transcript-input': () => this.showTranscriptInput(),
            'serenade:restart': () => this.restart()
        }));
    }

    deactivate() {
        this.subscriptions!.dispose();
        this.destroy();
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.state = new StateManager();
        this.settings = new Settings();
        const docsPanel = new DocsPanel(this.state);
        const commandHandler = new CommandHandler(this, this.state, this.settings);
        this.ipc = new AtomIPC(this, this.state, commandHandler);
        const alternatives = new Alternatives(this.state, this.ipc!, this.settings, new AlternativesPanel());
        this.transcriptInputView = new TranscriptInputView(this, this.ipc!);
        this.clientRunner = new ClientRunnerFactory(this.state, this.settings).get();

        alternatives.initialize();
        this.run();
    }

    focusEditor() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor !== undefined) {
            atom.workspace.paneForItem(this.currentEditor!)!.activate();
        }
    }

    restart() {
        this.clientRunner!.kill();
        this.clientRunner!.installAndRun(() => {});
    }

    showTranscriptInput() {
        this.initialize();
        this.setCurrentEditor();
        this.transcriptInputView!.show();
    }

    setCurrentEditor() {
        this.currentEditor = atom.workspace.getActiveTextEditor();
    }
}
