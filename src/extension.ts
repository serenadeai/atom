import App from './app';

const app = new App();

export function activate(_state: any) {
    app.activate();
}

export function deactivate() {
    app.deactivate();
}
