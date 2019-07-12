import * as Atom from 'atom';

import AlternativesPanel from './alternatives-panel';
import BaseAlternatives from './shared/alternatives';
import IPC from './shared/ipc';
import Settings from './shared/settings';
import StateManager from './shared/state-manager';

export default class Alternatives extends BaseAlternatives {
    private state: StateManager;
    private ipc: IPC;
    private settings: Settings;
    private alternativesPanel: AlternativesPanel;
    private container?: HTMLElement;
    private panel?: any;

    constructor(state: StateManager, ipc: IPC, settings: Settings, alternativesPanel: AlternativesPanel) {
        super();
        this.state = state;
        this.ipc = ipc;
        this.settings = settings;
        this.alternativesPanel = alternativesPanel;
    }

    $(e: string): HTMLElement|null {
        return this.container!.querySelector(e);
    }

    $$(e: string): NodeListOf<Element> {
        return this.container!.querySelectorAll(e);
    }

    addComputedStyleElement(element: HTMLElement) {
        this.container!.appendChild(element);
    }

    initialize() {
        this.createPanel();

        this.state.subscribe('alternatives', (data, previous) => {
            this.onAlternatives(data, previous);
        });

        this.state.subscribe('appState', (data, previous) => {
            this.onAppState(data, previous);
        });

        this.state.subscribe('highlighted', (data, previous) => {
            this.onHighlighted(data, previous);
        });

        this.state.subscribe('listening', (data, previous) => {
            this.onListening(data, previous);
        });

        this.state.subscribe('loading', (data, previous) => {
            this.onLoading(data, previous);
        });

        this.state.subscribe('loginError', (data, previous) => {
            this.onLoginError(data, previous);
        });

        this.state.subscribe('nuxCompleted', (data, previous) => {
            this.onNuxCompleted(data, previous);
        });

        this.state.subscribe('nuxStep', (data, previous) => {
            this.onNuxStep(data, previous);
        });

        this.state.subscribe('status', (data, previous) => {
            this.onStatus(data, previous);
        });

        this.state.subscribe('volume', (data, previous) => {
            this.onVolume(data, previous);
        });

        super.initialize();
    }

    private createPanel() {
        this.container = document.createElement('div');
        this.container.innerHTML = this.alternativesPanel.html();

        (this.$('.input-login-email')! as any).getModel().setPlaceholderText('Email');
        (this.$('.input-login-password')! as any).getModel().setPlaceholderText('Password');
        (this.$('.input-register-name')! as any).getModel().setPlaceholderText('Full name');
        (this.$('.input-register-email')! as any).getModel().setPlaceholderText('Email');
        (this.$('.input-register-password')! as any).getModel().setPlaceholderText('Password');

        this.panel = atom.workspace.addRightPanel({item: this.container, visible: false});
        this.panel.show();
    }

    getLoginFields(): {email: string, password: string} {
        return {
            email: (this.$('.input-login-email')! as any).getModel().getText(),
            password: (this.$('.input-login-password')! as any).getModel().getText()
        };
    }

    getRegisterFields(): {name: string, email: string, password: string} {
        return {
            name: (this.$('.input-register-name')! as any).getModel().getText(),
            email: (this.$('.input-register-email')! as any).getModel().getText(),
            password: (this.$('.input-register-password')! as any).getModel().getText()
        };
    }

    getState(key: string) {
        return this.state.get(key);
    }

    sendIPC(message: string, data: {[key: string]: any}) {
        this.ipc.send(message, data);
    }

    setState(key: string, value: any) {
        this.state.set(key, value);
    }

    setupLoginEvents() {
        // we need to handle form submission manually because atom doesn't support input fields
        this.$('.input-login-email')!.addEventListener('keyup', (e: any) => {
            if (e.which === 13) {
                this.login();
            }
        });

        this.$('.input-login-password')!.addEventListener('keyup', (e: any) => {
            if (e.which === 13) {
                this.login();
            }
        });

        this.$('.btn-login')!.addEventListener('click', () => {
            this.login();
        });
    }

    setupRegisterEvents() {
        // we need to handle form submission manually because atom doesn't support input fields
        this.$('.input-register-name')!.addEventListener('keyup', (e: any) => {
            if (e.which === 13) {
                this.register();
            }
        });

        this.$('.input-register-email')!.addEventListener('keyup', (e: any) => {
            if (e.which === 13) {
                this.register();
            }
        });

        this.$('.input-register-password')!.addEventListener('keyup', (e: any) => {
            if (e.which === 13) {
                this.register();
            }
        });

        this.$('.btn-register')!.addEventListener('click', () => {
            this.register();
        });
    }

    showDocsPanel(url: string) {
        const visible = this.getState('docs');
        this.setState('docs', visible === url ? false : url);
    }
}
