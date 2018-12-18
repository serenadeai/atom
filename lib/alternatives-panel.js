'use babel';

export default class AlternativesListView {
    constructor(ipc, settings) {
        this.ipc = ipc;
        this.settings = settings;
        this.recording = false;

        this._createPanel();
    }

    _createPanel() {
        this.container = document.createElement('div');
        let cancel = `<button class="btn alternatives-cancel">Cancel</button>`;
        let record = `<button class="btn alternatives-record">Record</button>`;

        this.container.innerHTML = `
<div class="alternatives">
    <div class="alternatives-logo">
        <img src="atom://serenade-atom/images/wordmark.png" />
    </div>
    <div class="alternatives-status">Inactive</div>
    <div class="alternatives-controls">
        ${this.settings.autorecord() ? '' : record}
        ${cancel}
    </div>
    <div class="alternatives-list"></div>
</div>
        `;

        // send cancel command on cancel button click
        this.container.querySelector('.alternatives-cancel').addEventListener('click', (e) => {
            this.ipc.sendText('cancel');
        });

        // send use command on alternative click
        this.container.querySelector('.alternatives-list').addEventListener('click', (e) => {
            let $row = e.target.closest('.alternative-row');
            let index = $row.getAttribute('data-index');
            this.ipc.sendText(`use ${index}`);
        });

        let $record = this.container.querySelector('.alternatives-record');
        if ($record) {
            $record.addEventListener('click', (e) => {
                this.container.querySelector('.alternatives-record').innerHTML = this.recording ? 'Record' : 'Done';
                if (this.recording) {
                    this.ipc.send('DISABLE_RECORDING');
                }
                else {
                    this.ipc.send('ENABLE_RECORDING');
                }

                this.recording = !this.recording;
            });
        }

        this.panel = atom.workspace.addRightPanel({
            item: this.container,
            visible: false
        });
        this.panel.show();
    }

    _rows(alternatives) {
        let allInvalid = true;
        let index = 1;
        let rows = alternatives.map((e, i) => {
            // for invalid commands, show an X rather than a number
            let rowClass = '';
            let number = index;
            if (
                e.sequences.length == 1 &&
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

            // We join this with newlines so that this is a string. Otherwise we see a bunch of commas
            // when there are multiple commands without code.
            let code = e.sequences.map((sequence) => {
                return (sequence.code)
                    ? `<div class="alternative-code"><pre>${this._escape(sequence.code)}</pre></div>`
                    : '';
            }).join('\n');

            return `
<a class="alternative-row ${rowClass}" data-index="${number}">
    <div class="alternative-number">
        ${number}
    </div>
    <div class="alternative-description">${this._escape(description) || this._escape(e.transcript)}</div>
    ${code}
</a>`;
        });

        return rows.join('');
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

    clear() {
        this.show([]);
    }

    highlight(index) {
        let rows = this.container.querySelectorAll('.alternatives-list .alternative-row:not(.invalid)');
        if (index < rows.length) {
            rows[index].classList.add('highlighted');
        }
    }

    show(alternatives) {
        this.container.querySelector('.alternatives-list').innerHTML = this._rows(alternatives);
    }

    updateStatus(text) {
        this.container.querySelector('.alternatives-status').innerHTML = text;
    }
}
