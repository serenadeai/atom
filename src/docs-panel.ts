import StateManager from './shared/state-manager';

export default class DocsPanel {
    private state: StateManager;
    private container?: HTMLElement;
    private panel?: any;

    constructor(state: StateManager) {
        this.state = state;

        this.createPanel();
        this.state.subscribe('docs', (url) => {
            if (url) {
                this.container!.querySelector('iframe')!.setAttribute('src', url);
                this.panel!.show();
            }
            else {
                this.panel!.hide();
            }
        });
    }

    private createPanel() {
        this.container = document.createElement('div');
        this.container.innerHTML = `
<div class="docs-panel">
  <iframe src="https://docs.serenade.ai" frameBorder="0"></iframe>
  <button class="btn btn-close">&times;</button>
</div>
        `;
        this.container.querySelector('.btn-close')!.addEventListener('click', () => {
            this.state!.set('docs', false);
        });

        this.panel = atom.workspace.addRightPanel({item: this.container, visible: false});
    }
}
