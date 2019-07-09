'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesPanel from './alternatives-panel';
import ClientRunnerFactory from './client-runner/client-runner-factory';
import CommandHandler from './command-handler';
import DocsPanel from './docs-panel';
import IPC from './ipc';
import Settings from './settings';
import StateManager from './state-manager';
import TranscriptInputView from './transcript-input-view';

class App {
    activate(state) {
        this.initialize();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade:initialize': () => this.initialize(),
            'serenade:show-transcript-input': () => this.showTranscriptInput(),
            'serenade:restart': () => this.restart()
        }));
    }

    deactivate() {
        this.clientRunner.kill();

        this.subscriptions.dispose();
        this.ipc.stop();
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.state = new StateManager();
        this.settings = new Settings();
        this.docsPanel = new DocsPanel(this.state);
        this.commandHandler = new CommandHandler(this, this.state, this.settings);
        this.ipc = new IPC(this, this.state, this.commandHandler);
        this.alternativesPanel = new AlternativesPanel(this.state, this.ipc, this.settings);
        this.transcriptInputView = new TranscriptInputView(this, this.ipc);

        this.state.set('appState', 'LOADING');
        this.state.set('nuxCompleted', this.settings.get('nux_completed'));
        this.state.set('alternatives', {});
        this.state.set('volume', 0);
        this.state.set('listening', false);
        this.state.set('status', 'Paused');

        this.ipc.start();
        this.clientRunner = new ClientRunnerFactory(this.state, this.settings).get();
        this.clientRunner.installAndRun(() => {
            const token = this.settings.get('token');
            this.state.set('appState', token && token.length ? 'READY' : 'LOGIN_FORM');
        });

        this.state.subscribe('nuxCompleted', (completed) => {
            this.settings.set('nux_completed', completed);
        });
    }

    focusEditor() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor) {
            atom.workspace.paneForItem(this.currentEditor).activate();
        }
    }

    restart() {
        this.clientRunner.kill();
        this.clientRunner.installAndRun();
    }

    showTranscriptInput() {
        this.initialize();
        this.setCurrentEditor();
        this.transcriptInputView.show();
    }

    setCurrentEditor() {
        this.currentEditor = atom.workspace.getActiveTextEditor();
    }
}

export default new App();
