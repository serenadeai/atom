'use babel';

import Suggestions from './suggestions';

export default class AlternativesListView {
    constructor(delegate, ipc, settings) {
        this.delegate = delegate;
        this.ipc = ipc;
        this.settings = settings;
        this.suggestions = new Suggestions();
        this.filesShowing = false;

        this._createPanel();
        this._alternativesShowing = true;
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
        let clear = `<button class="btn alternatives-clear">Clear</button>`;
        let listen = `<button class="btn alternatives-listen">Listen</button>`;

        this._container.innerHTML = `
<div class="alternatives">
    <div class="alternatives-logo">
        <img src="atom://serenade-atom/images/wordmark.png" />
    </div>
    <div class="alternatives-status">Not Running</div>
    <div class="alternatives-controls">
        ${!this.settings.showListenControls() ? '' : listen}
        ${clear}
    </div>
    <div class="alternatives-header"></div>
    <div class="alternatives-list"></div>
</div>
        `;

        // send clear command on clear button click
        this._container.querySelector('.alternatives-clear').addEventListener('click', (e) => {
            this.ipc.sendText('cancel');
        });

        // send use command on alternative click
        this._container.querySelector('.alternatives-list').addEventListener('click', (e) => {
            let $row = e.target.closest('.alternative-row');
            let index = $row.getAttribute('data-index');
            this.ipc.sendText(`use ${index}`);
        });

        let $listen = this._container.querySelector('.alternatives-listen');
        if ($listen) {
            $listen.addEventListener('click', (e) => {
                if (this.delegate.listening) {
                    this.ipc.send('DISABLE_LISTENING');
                }
                else {
                    this.ipc.send('ENABLE_LISTENING');
                }
            });
        }

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

    _updateListenControls() {
        let $listen = this._container.querySelector('.alternatives-listen');
        if ($listen) {
            $listen.innerHTML = this.delegate.listening ? 'Stop' : 'Listen';
        }
    }

    highlight(index) {
        if (!this._alternativesShowing) {
            return;
        }

        let rows = this._container.querySelectorAll('.alternatives-list .alternative-row:not(.invalid)');
        if (index < rows.length) {
            rows[index].classList.add('highlighted');
        }
    }

    showAlternatives(alternatives, options) {
        this.filesShowing = options && options.type == 'files';
        this._container.querySelector('.alternatives-list').innerHTML = this._alternativeRows(alternatives, {
            truncate: this.filesShowing ? 50 : false
        });
        this._container.querySelector('.alternatives-header').innerHTML = '';
        this._alternativesShowing = true;
    }

    showSuggestions() {
        // don't re-shuffle suggestions if they're already showing
        if (!this._alternativesShowing) {
            return;
        }

        let suggestions = this.suggestions.random(5);
        this._container.querySelector('.alternatives-list').innerHTML = this._suggestionRows(suggestions);
        this._container.querySelector('.alternatives-header').innerHTML = 'Try saying';
        this._alternativesShowing = false;
    }

    updateStatus(text) {
        this._container.querySelector('.alternatives-status').innerHTML = text;
        this._updateListenControls();
    }
}
