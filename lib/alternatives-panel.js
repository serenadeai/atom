'use babel';

export default class AlternativesListView {
    constructor(serializedState) {
        this._createPanel();
    }

    _createPanel() {
        this.container = document.createElement('div');
        this.container.innerHTML = `
<div class="alternatives">
    <div class="alternatives-logo">
        <img src="atom://serenade-atom/images/wordmark.png" />
    </div>
    <div class="alternatives-status">Inactive</div>
    <div class="alternatives-list"></div>
</div>
        `;

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
            }).join(' ');

            let code = e.sequences.map((sequence) => {
                return (sequence.code)
                    ? `<div class="alternative-code"><pre>${this._escape(sequence.code)}</pre></div>`
                    : '';
            });

            return `
<div class="alternative-row ${rowClass}">
    <div class="alternative-number">
        ${number}
    </div>
    <div class="alternative-description">${this._escape(description) || this._escape(e.transcript)}</div>
    ${code}
</div>`;
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
        this.container.querySelector('.alternatives-list .alternative-row:nth-child(' + (index + 1) + ')').classList.add('highlighted');
    }

    show(alternatives) {
        this.container.querySelector('.alternatives-list').innerHTML = this._rows(alternatives);
    }

    updateStatus(text) {
        this.container.querySelector('.alternatives-status').innerHTML = text;
    }
}
