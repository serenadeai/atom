'use babel';

export default class Alert {
    constructor(serializedState) {
        // create container
        this.element = document.createElement('div');
        this.element.classList.add('serenade-atom');
        this.element.classList.add('alert-panel');

        // create element to hold text message
        this.message = document.createElement('div');
        this.element.appendChild(this.message);

        // create native atom panel at top of editor
        this.panel = atom.workspace.addTopPanel({
            item: this.element,
            visible: false
        });
    }

    destroy() {
        this.element.destroy();
    }

    hide() {
        this.panel.hide();
    }

    serialize() {}

    setMessage(message, action, callback) {
        // create h3 with <span> for message and <a> for click
        let headerElement = document.createElement('h3');
        let messageElement = document.createElement('span');
        messageElement.innerHTML = message;
        let clickElement = document.createElement('a');
        clickElement.setAttribute('href', '#');
        clickElement.innerHTML = action;
        clickElement.addEventListener('click', (e) => {
            e.preventDefault();
            callback(e);
        }, false);

        // remove previous alert with new elements
        while (this.message.firstChild) {
            this.message.removeChild(this.message.firstChild);
        }

        headerElement.appendChild(messageElement);
        headerElement.appendChild(clickElement);
        this.message.appendChild(headerElement);
    }

    show() {
        this.panel.show();
    }

    visible() {
        return this.panel.isVisible();
    }
}
