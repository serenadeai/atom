import * as Atom from 'atom';

import AlternativesPanel from './alternatives-panel';
import BaseAlternatives from './shared/alternatives';
import {DiffRange, DiffRangeType} from './shared/diff';
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

        const prototype = Object.getPrototypeOf(this);
        const events = this.eventHandlers();
        for (const key of Object.keys(events)) {
            this.state.subscribe(key, (data: any, previous: any) => {
                prototype[events[key].name].call(this, data, previous);
            });
        }

        super.initialize();
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

    onHighlightedRanges(ranges: DiffRange[], _previous: DiffRange[]) {
        const duration = 250;
        const steps = [1, 2, 3, 4, 3, 2, 1];
        const step = duration / steps.length;
        const editor = atom.workspace.getActiveTextEditor();
        if (!editor || ranges.length == 0) {
            return;
        }

        for (let range of ranges) {
            for (let i = 0; i < steps.length; i++) {
                setTimeout(() => {
                    const marker = editor.markBufferRange([range.start, range.stop]);
                    editor.decorateMarker(marker, {
                        'type': 'highlight',
                        'class': range.diffRangeType == DiffRangeType.Delete ? `error-color-${steps[i]}` :
                                                                               `success-color-${steps[i]}`
                    });
                    setTimeout(() => {
                        marker.destroy();
                    }, step);
                }, i * step);
            }
        }
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
