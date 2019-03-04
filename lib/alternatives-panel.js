'use babel';

import Suggestions from './suggestions';

export default class AlternativesPanel {
    constructor(state, ipc, settings) {
        this.state = state;
        this.ipc = ipc;
        this.settings = settings;
        this.suggestions = new Suggestions();
        this._createPanel();

        this.state.subscribe('alternatives', (data, previous) => {
            // show alternatives if specified
            if ('alternatives' in data) {
                let header = '';
                if (data.alternatives.length == 0) {
                    if (data.type == 'files') {
                        header = 'No matching files found.';
                    }
                }
                else if (data.alternatives.length > 1) {
                    header = 'Did you mean';
                }

                this._container.querySelector('.alternatives-header').innerHTML = header;
                this._container.querySelector('.alternatives-list').innerHTML = this._alternativeRows(data.alternatives, {
                    truncate: data.type == 'files' ? 50 : false
                });
            }

            // show suggestions if there aren't any alternatives
            else if (!previous || (previous && 'alternatives' in previous)) {
                let suggestions = this.suggestions.random(5);
                this._container.querySelector('.alternatives-header').innerHTML = 'Try saying';
                this._container.querySelector('.alternatives-list').innerHTML = this._suggestionRows(suggestions);
            }
        });

        this.state.subscribe('highlighted', (index) => {
            if (!('alternatives' in this.state.get('alternatives'))) {
                return;
            }

            let rows = this._container.querySelectorAll('.alternatives-list .alternative-row:not(.invalid)');
            if (index < rows.length) {
                rows[index].classList.add('highlighted');
            }
        });

        this.state.subscribe('status', (status) => {
            this._container.querySelector('.alternatives-status').innerHTML = status;
            this._container.querySelector('.btn-listen').innerHTML = status == 'Listening' ? 'Pause' : 'Listen';
            if (status == 'Paused') {
                this.state.set('volume', 0);
            }
        });

        this.state.subscribe('help', (visible) => {
            let text = visible ? 'Close Help' : 'Help';
            this._container.querySelector('.btn-help').innerHTML = text;
        });

        this.state.subscribe('volume', (volume) => {
            volume = volume || 0;
            this._container.querySelector('.alternatives-bar').style.width = volume + '%';
        });

        this.state.subscribe('ready', (ready) => {
            let $token = this._container.querySelector('.alternatives-token-container');
            let $volume = this._container.querySelector('.alternatives-volume-container');
            let $list = this._container.querySelector('.alternatives-list-container');

            if (ready === 'initializing') {
                $token.classList.add('hidden');
                $volume.classList.add('hidden');
                $list.classList.add('hidden');
            }
            else if (ready == 'token') {
                $token.classList.remove('hidden');
                $volume.classList.add('hidden');
                $list.classList.add('hidden');
            }
            else {
                $token.classList.add('hidden');
                $volume.classList.remove('hidden');
                $list.classList.remove('hidden');
            }
        });
    }

    _alternativeRows(alternatives, options) {
        let allInvalid = true;
        let index = 1;
        let rows = alternatives.map((e, i) => {
            // for invalid commands, show an X rather than a number
            let rowClass = '';
            let number = index;
            if (
                e.sequences.length == 1 &&
                e.sequences[0].commands &&
                e.sequences[0].commands.length == 1 &&
                e.sequences[0].commands[0].type == 'COMMAND_TYPE_INVALID'
            ) {
                number = '&times';
                rowClass = 'invalid';
            }
            else {
                allInvalid = false;
                index++;
            }

            let description = e.sequences.map((sequence) => {
                return ((sequence.description && sequence.description.trim()) || sequence.transcript);
            }).join(', ');
            let descriptionText = this._escape(description) || this._escape(e.transcript);

            let codeText = e.sequences.map((sequence) => { return sequence.code; }).join('');
            let code = '';
            if (codeText.includes('\n')) {
                // we join this with newlines so that this is a string, otherwise we see a bunch of commas
                // when there are multiple commands without code
                code = e.sequences.map((sequence) => {
                    return (sequence.code)
                        ? `<div class="alternative-code"><pre>${this._escape(sequence.code)}</pre></div>`
                        : '';
                }).join('\n');
            }
            else if (codeText) {
                // truncate text as needed
                if (options && options.truncate !== false) {
                    codeText = this._truncate(codeText, options.truncate);
                }

                // if there's no newline in the code, then just show it inline
                descriptionText += ` <pre class="inline">${this._escape(codeText)}</pre>`;
            }

            return `
<a class="alternative-row ${rowClass}" data-index="${number}">
    <div class="alternative-number">
        ${number}
    </div>
    <div class="alternative-description">${descriptionText}</div>
    ${code}
</a>`;
        });

        return rows.join('');
    }

    _createPanel() {
        this._container = document.createElement('div');
        this._container.innerHTML = `
<div class="alternatives">
    <div class="alternatives-logo-container">
        <div class="alternatives-logo">
            <img src="atom://serenade-atom/images/wordmark.png" />
        </div>
        <div class="alternatives-status">${this.state.get('status')}</div>
    </div>
    <div class="alternatives-token-container">
        <div class="alternatives-token-text">
            Don't have a beta token? <a href="https://serenade.ai">Request one.</a>
        </div>
        <div class="alternatives-token-controls">
            <atom-text-editor class="input-token" mini="true"></atom-text-editor>
            <button class="btn btn-token-save">Save</button>
        </div>
    </div>
    <div class="alternatives-volume-container">
        <button class="btn btn-listen">Listen</button>
        <button class="btn btn-menu">
            <i class="fas fa-chevron-down"></i>
            <div class="menu-dropdown hidden">
                <a href="#" class="btn-clear">Clear</a>
                <a href="#" class="btn-help">Help</a>
            </div>
        </button>
        <div class="alternatives-bar-container">
            <div class="alternatives-bar"></div>
        </div>
    </div>
    <div class="alternatives-list-container">
        <div class="alternatives-header"></div>
        <div class="alternatives-list"></div>
    </div>
</div>
        `;

        // toggle dropdown on dropdown button click
        this._container.querySelector('.btn-menu').addEventListener('click', (e) => {
            this._container.querySelector('.btn-menu i').classList.toggle('active');
            let $dropdown = this._container.querySelector('.menu-dropdown');
            if ($dropdown.classList.contains('active')) {
                $dropdown.classList.toggle('active');
                setTimeout(() => {
                    $dropdown.classList.add('hidden');
                }, 200);
            }
            else {
                $dropdown.classList.remove('hidden');
                setTimeout(() => {
                    $dropdown.classList.toggle('active');
                }, 1);
            }
        });

        // toggle listening state (managed by client) on listen button click
        this._container.querySelector('.btn-listen').addEventListener('click', (e) => {
            if (this.state.get('status') == 'Listening') {
                this.ipc.send('DISABLE_LISTENING');
            }
            else {
                this.ipc.send('ENABLE_LISTENING');
            }
        });

        // toggle help state on help button click
        this._container.querySelector('.btn-help').addEventListener('click', (e) => {
            this.state.set('help', !this.state.get('help'));
        });

        // send clear command on clear button click
        this._container.querySelector('.btn-clear').addEventListener('click', (e) => {
            this.ipc.sendText('cancel');
        });

        // send use command on alternative click
        this._container.querySelector('.alternatives-list').addEventListener('click', (e) => {
            let $row = e.target.closest('.alternative-row');
            if ($row.classList.contains('suggestion')) {
                return;
            }

            let index = $row.getAttribute('data-index');
            this.ipc.sendText(`use ${index}`);
        });

        // save authentication token on save click
        let inputToken = this._container.querySelector('.input-token').getModel();
        inputToken.setPlaceholderText('Enter your token.');
        this._container.querySelector('.btn-token-save').addEventListener('click', (e) => {
            this.settings.setToken(inputToken.getText());
            this.ipc.send('RELOAD_SETTINGS');
            this.state.set('ready', 'ready');
        });

        this._panel = atom.workspace.addRightPanel({
            item: this._container,
            visible: false
        });
        this._panel.show();
    }

    _escape(s) {
        if (!s) {
            return s;
        }

        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    _suggestionRows(suggestions) {
        let rows = suggestions.map((e, i) => {
            return `
<a class="alternative-row suggestion">
    <div class="alternative-description">${e}</div>
</a>`;
        });

        return rows.join('');
    }

    _truncate(string, size) {
        if (string.length <= size) {
            return string;
        }

        size -= '...'.length;
        size = Math.floor(size / 2);
        return string.substr(0, size) + '...' + string.substr(string.length - size);
    }
}
