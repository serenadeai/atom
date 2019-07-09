'use babel';

export default class AlternativesPanel {
    constructor(state, ipc, settings) {
        this.state = state;
        this.ipc = ipc;
        this.settings = settings;
        this._createPanel();

        this.state.subscribe('alternatives', (data, previous) => {
            // show alternatives if specified
            if ('alternatives' in data) {
                let header = '';
                if (data.alternatives.length === 0) {
                    if (data.type === 'files') {
                        header = 'No matching files found';
                    }
                }
                else if (data.alternatives.length > 1) {
                    header = 'Did you mean';
                }

                const validRows = this._alternativeRows(data.alternatives, {
                    truncate: data.type === 'files' ? 50 : false,
                    validOnly: true
                });

                const $valid = this.$('.alternatives-valid');
                if (validRows.length > 0) {
                    $valid.classList.remove('hidden');
                    this.$('.alternatives-valid-header').innerHTML =
                        data.type === 'files' ? 'Select a file' : 'Select a command';
                    this.$('.alternatives-valid-list').innerHTML = validRows.join('');
                }
                else {
                    $valid.classList.add('hidden');
                }

                const invalidRows = this._alternativeRows(data.alternatives, {
                    invalidOnly: true
                });

                const $invalid = this.$('.alternatives-invalid');
                if (invalidRows.length > 0) {
                    $invalid.classList.remove('hidden');
                    this.$('.alternatives-invalid-header').innerHTML = 'Invalid commands';
                    this.$('.alternatives-invalid-list').innerHTML = invalidRows.join('');
                }
                else {
                    $invalid.classList.add('hidden');
                }
            }

            // show suggestions if there aren't any alternatives
            else if (data.suggestions || !previous || (previous && 'alternatives' in previous)) {
                const completed = this.state.get('nuxCompleted');
                this.$('.alternatives-valid').classList.remove('hidden');
                this.$('.alternatives-valid-header').innerHTML = completed ? 'Try saying' : '';
                this.$('.alternatives-valid-list').innerHTML = completed ? this._suggestionRows(this._randomSuggestions(5)) : '';

                this.$('.alternatives-invalid').classList.add('hidden');
                this.$('.alternatives-invalid-header').innerHTML = '';
                this.$('.alternatives-invalid-list').innerHTML = '';
            }
        });

        this.state.subscribe('appState', (state) => {
            this.$('.alternatives').classList.remove('hidden');
            const $login = this.$('.alternatives-login-container');
            const $volume = this.$('.alternatives-volume-container');
            const $list = this.$('.alternatives-list-container');
            const $nux = this.$('.nux');

            if (state === 'LOADING') {
                $login.classList.add('hidden');
                $volume.classList.add('hidden');
                $list.classList.add('hidden');
                $nux.classList.add('hidden');
            }
            else if (state === 'LOGIN_FORM') {
                $login.classList.remove('hidden');
                $volume.classList.add('hidden');
                $list.classList.add('hidden');
                $nux.classList.add('hidden');
                this.$('.alternatives-status').innerHTML = '';
            }
            else if (state === 'READY') {
                $login.classList.add('hidden');
                $volume.classList.remove('hidden');
                $list.classList.remove('hidden');
                this.state.set('status', 'Paused');

                if (!this.state.get('nuxCompleted')) {
                    $nux.classList.remove('hidden');
                }
            }
        });

        this.state.subscribe('highlighted', (index) => {
            const alternatives = this.state.get('alternatives');
            if (!('alternatives' in alternatives)) {
                return;
            }

            const rows = this.$$('.alternatives-valid-list .alternative-row:not(.invalid)');
            if (index < rows.length) {
                this.$('.alternatives-valid-header').innerHTML = 'Ran command';
                rows[index].classList.add('highlighted');
            }
        });

        this.state.subscribe('listening', (on) => {
            this.$('.btn-listen').innerHTML = on ? 'Pause' : 'Listen';
            if (on) {
                this.$('.listening-indicator').classList.remove('hidden');
            }
            else {
                this.$('.listening-indicator').classList.add('hidden');
            }
        });

        this.state.subscribe('loading', (on) => {
            if (on) {
                this.$('.alternatives-valid-header').innerHTML =
                    '<div class="lds-ring"><div></div><div></div><div></div><div></div></div>Loading...';
            }
        });

        this.state.subscribe('loginError', (error) => {
            this.$('.btn-login').removeAttribute('disabled');
            this.$('.btn-login .lds-ring').classList.add('hidden');
            this.$('.btn-register').removeAttribute('disabled');
            this.$('.btn-register .lds-ring').classList.add('hidden');

            this.$$('.login-error').forEach(e => {
                e.classList.remove('hidden');
                e.innerHTML = error;
            });
        });

        this.state.subscribe('nuxCompleted', (completed) => {
            if (completed) {
                this.$('.nux').classList.add('hidden');
                return;
            }

            this.state.set('nuxStep', 0);
            this.$('.nux').classList.remove('hidden');
            this.$('.btn-nux-next').addEventListener('click', () => {
                const stepIndex = this.state.get('nuxStep');
                if (stepIndex < this._nuxSteps().length - 1) {
                    this.state.set('nuxStep', stepIndex + 1);
                }
                else {
                    this.state.set('nuxCompleted', true);
                    this.state.set('alternatives', { suggestions: true });
                }
            });
        });

        this.state.subscribe('nuxStep', (stepIndex) => {
            const steps = this._nuxSteps();
            const step = steps[stepIndex];
            this.$('.btn-nux-next').innerHTML = stepIndex === steps.length - 1 ? 'Close' : 'Next';
            this.$('.nux-progress').style.width = Math.max(1, Math.ceil((stepIndex / (steps.length - 1)) * 100)) + '%';
            this.$('.nux-heading').innerHTML = step.title;
            this.$('.nux-body').innerHTML = step.body;
        });

        this.state.subscribe('status', (status) => {
            this.$('.alternatives-status').innerHTML = status;
        });

        this.state.subscribe('volume', (volume) => {
            volume = volume || 0;
            this.$('.alternatives-bar').style.width = volume + '%';
        });
    }

    $(e) {
        return this._container.querySelector(e);
    }

    $$(e) {
        return this._container.querySelectorAll(e);
    }

    _alternativeRows(alternatives, options) {
        let index = 1;
        return alternatives.map((e, i) => {
            // for invalid commands, show an X rather than a number
            let rowClass = '';
            let number = index.toString();
            if (
                e.sequences &&
                e.sequences.length == 1 &&
                e.sequences[0].commands &&
                e.sequences[0].commands.length == 1 &&
                e.sequences[0].commands[0].type == 'COMMAND_TYPE_INVALID'
            ) {
                number = '&times';
                rowClass = 'invalid';
                if (options.validOnly) {
                    return null;
                }
            }
            else {
                index++;
                if (options.invalidOnly) {
                    return null;
                }
            }

            // replace code markup with appropriate HTML
            let newline = e.sequences.some(s => s.commands.some(c => c.type === 'COMMAND_TYPE_SNIPPET_EXECUTED'));
            const description = e.description.replace(/<code>([\s\S]+)<\/code>/g, (s, m) => {
                if (m.includes('\n')) {
                    newline = true;
                    return `<div class="alternative-code"><pre>${this._escape(m)}</pre></div>`
                }
                else {
                    if (options && options.truncate !== false) {
                        m = this._truncate(m, options.truncate);
                    }

                    return ` <pre class="inline">${this._escape(m)}</pre>`;
                }
            });

            return `
<a class="alternative-row ${rowClass} ${newline ? 'has-newline' : ''}" data-index="${number}">
    <div class="alternative-row-inner">
        <div class="alternative-number">
            <div class="alternative-number-inner">${number}</div>
        </div>
        <div class="alternative-description">${description}</div>
    </div>
</a>`;
        })
        .filter(e => e !== null);
    }

    _createPanel() {
        this._container = document.createElement('div');
        this._container.innerHTML = `
<div class="alternatives hidden">
  <div class="alternatives-logo-container">
    <div class="alternatives-logo">
      <img src="atom://serenade/images/wordmark.png" />
    </div>
    <div class="hidden listening-indicator"></div>
    <div class="spacer"></div>
    <div class="alternatives-status"></div>
  </div>
  <div class="alternatives-login-container">
    <div class="alternatives-pre-login-buttons">
      <button class="btn btn-pre-login">Sign in</button>
      <button class="btn btn-pre-register">Sign up for Serenade</button>
    </div>
    <div class="alternatives-login hidden">
      <div class="login-error hidden"></div>
      <form class="alternatives-login-form">
        <atom-text-editor tabindex="1" class="input-login-email" mini="true"></atom-text-editor>
        <atom-text-editor tabindex="2" class="input-login-password" mini="true"></atom-text-editor>
        <button class="btn btn-login">
            Sign in
            <div class="lds-ring hidden"><div></div><div></div><div></div><div></div></div>
        </button>
        <a href="#" class="btn-login-alt btn-pre-register">Or sign up for an account</a>
      </form>
    </div>
    <div class="alternatives-register hidden">
      <div class="login-error hidden"></div>
      <form class="alternatives-register-form">
        <atom-text-editor tabindex="1" class="input-register-name" mini="true"></atom-text-editor>
        <atom-text-editor tabindex="2" class="input-register-email" mini="true"></atom-text-editor>
        <atom-text-editor tabindex="3" class="input-register-password" mini="true"></atom-text-editor>
        <button class="btn btn-register">
            Sign up for Serenade
            <div class="lds-ring hidden"><div></div><div></div><div></div><div></div></div>
        </button>
      </form>
    </div>
  </div>
  <div class="alternatives-volume-container">
    <button class="btn btn-listen">Listen</button>
    <button class="btn btn-menu">
      <i class="fas fa-chevron-down"></i>
      <div class="menu-dropdown hidden">
        <a href="#" class="btn-clear">Clear</a>
        <a href="#" class="btn-guide">Guide</a>
        <a href="#" class="btn-reference">Reference</a>
      </div>
    </button>
    <div class="alternatives-bar-container">
      <div class="alternatives-bar"></div>
    </div>
  </div>
  <div class="nux hidden">
    <div class="nux-progress"></div>
    <h2 class="nux-heading"></h2>
    <div class="nux-body"></div>
    <button class="btn btn-nux-next">Next</button>
  </div>
  <div class="alternatives-list-container hidden">
    <div class="alternatives-valid">
      <div class="alternatives-valid-header"></div>
      <div class="alternatives-valid-list"></div>
    </div>
    <div class="alternatives-invalid">
      <div class="alternatives-invalid-header"></div>
      <div class="alternatives-invalid-list"></div>
    </div>
  </div>
</div>
        `;

        // show login form
        this.$('.btn-pre-login').addEventListener('click', () => {
            this.$('.alternatives-login').classList.remove('hidden');
            this.$('.alternatives-register').classList.add('hidden');
            this.$('.alternatives-pre-login-buttons').classList.add('hidden');
        });

        // show register form
        this.$$('.btn-pre-register').forEach(e => {
            e.addEventListener('click', () => {
                this.$('.alternatives-register').classList.remove('hidden');
                this.$('.alternatives-login').classList.add('hidden');
                this.$('.alternatives-pre-login-buttons').classList.add('hidden');
            });
        });

        // placeholders can't be set in HTML for some reason
        this.$('.input-login-email').getModel().setPlaceholderText('Email');
        this.$('.input-login-password').getModel().setPlaceholderText('Password');

        // and we need to handle form submission manually
        this.$('.input-login-email').addEventListener('keyup', (e) => {
            if (e.which === 13) {
                this._login();
            }
        });
        this.$('.input-login-password').addEventListener('keyup', (e) => {
            if (e.which === 13) {
                this._login();
            }
        });
        this.$('.btn-login').addEventListener('click', (e) => {
            this._login();
        });

        // placeholders can't be set in HTML for some reason
        this.$('.input-register-name').getModel().setPlaceholderText('Full name');
        this.$('.input-register-email').getModel().setPlaceholderText('Email');
        this.$('.input-register-password').getModel().setPlaceholderText('Password');

        // and we need to handle form submission manually
        this.$('.input-register-name').addEventListener('keyup', (e) => {
            if (e.which === 13) {
                this._register();
            }
        });
        this.$('.input-register-email').addEventListener('keyup', (e) => {
            if (e.which === 13) {
                this._register();
            }
        });
        this.$('.input-register-password').addEventListener('keyup', (e) => {
            if (e.which === 13) {
                this._register();
            }
        });
        this.$('.btn-register').addEventListener('click', (e) => {
            this._register();
        });

        // toggle dropdown on dropdown button click
        this.$('.btn-menu').addEventListener('click', (e) => {
            this.$('.btn-menu i').classList.toggle('active');
            const $dropdown = this.$('.menu-dropdown');
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
        this.$('.btn-listen').addEventListener('click', (e) => {
            this.state.set('listening', !this.state.get('listening'));
        });

        // toggle guide
        this.$('.btn-guide').addEventListener('click', (e) => {
            this._toggleDocsPanel('https://docs.serenade.ai');
        });

        // toggle reference
        this.$('.btn-reference').addEventListener('click', (e) => {
            this._toggleDocsPanel('https://docs.serenade.ai/docs/reference.html');
        });

        // send clear command on clear button click
        this.$('.btn-clear').addEventListener('click', (e) => {
            this.ipc.sendText('cancel');
        });

        // send use command on alternative click
        this.$('.alternatives-valid-list').addEventListener('click', (e) => {
            const $row = e.target.closest('.alternative-row');
            if ($row.classList.contains('suggestion')) {
                return;
            }

            const index = $row.getAttribute('data-index');
            this.ipc.sendText(`use ${index}`);
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
            .replace(/'/g, "&apos;");
    }

    _login() {
        this.$('.btn-login .lds-ring').classList.remove('hidden');
        this.$('.btn-login').setAttribute('disabled', 'true');

        this.ipc.send('AUTHENTICATE', {
            email: this.$('.input-login-email').getModel().getText(),
            password: this.$('.input-login-password').getModel().getText()
        });
    }

    _randomSuggestions(n) {
        let choices = this._suggestions();
        let result = [];
        for (let i = 0; i < n; i++) {
            result.push(choices.splice(Math.floor(Math.random() * choices.length), 1)[0]);
        }

        return result;
    }

    _register() {
        this.$('.btn-register .lds-ring').classList.remove('hidden');
        this.$('.btn-register').setAttribute('disabled', 'true');

        this.ipc.send('REGISTER', {
            name: this.$('.input-register-name').getModel().getText(),
            email: this.$('.input-register-email').getModel().getText(),
            password: this.$('.input-register-password').getModel().getText()
        });
    }

    _suggestionRows(suggestions) {
        const rows = suggestions.map((e, i) => {
            return `
<a class="alternative-row suggestion">
    <div class="alternative-description">${e}</div>
</a>`;
        });

        return rows.join('');
    }

    _toggleDocsPanel(url) {
        const visible = this.state.get('docs');
        this.state.set('docs', visible === url ? false : url);
    }

    _truncate(string, size) {
        if (string.length <= size) {
            return string;
        }

        size -= '...'.length;
        size = Math.floor(size / 2);
        return string.substr(0, size) + '...' + string.substr(string.length - size);
    }

    _nuxSteps() {
        return [
            {
                title: 'Welcome to Serenade!',
                body: '<p>This guide will walk you through an introduction to Serenade.</p>'
            },
            {
                title: 'Setup',
                body:
                "<p>You should keep Serenade open in a panel that's side-by-side with the code you're editing, " +
                "since you'll need to see what's displayed here.</p>"
            },
            {
                title: 'Tabs and alternatives',
                body:
                '<p>Start by pressing the Listen button above. Now, say "new tab" to create a new tab.</p>' +
                "<p>You might see a list of alternatives appear on screen. This list appears when Serenade isn't " +
                'exactly sure what you said. When it appears, you can say "clear" to clear the list and start over, ' +
                'continue speaking a command, or say "use" followed by the number you want to select, like "use one" ' +
                'or "use three".</p>'
            },
            {
                title: 'Save',
                body:
                '<p>Now, let\'s write some Python. First, say "save" to invoke the save dialog, then save the file ' +
                'as hello.py.</p>'
            },
            {
                title: 'Add import',
                body:
                '<p>Try saying "add import random" to add an import statement. Remember, you\'ll need to say ' +
                '"use one" in order to run the command, or "clear" to try again.</p>'
            },
            {
                title: 'Undo',
                body:
                '<p>If you accidentally select the wrong alternative, you can always say "undo" to go back. ' +
                '"redo" also works.</p>'
            },
            {
                title: 'Add function',
                body: '<p>Next, create a function by saying "add function get random", followed by a "use" command.</p>'
            },
            {
                title: 'Add parameter',
                body:
                '<p>You can add a parameter called "number" to your function by saying "add parameter number", ' +
                'followed by a "use" command.</p>'
            },
            {
                title: 'Add return',
                body: '<p>Let\'s give the function a body. Say "add return 4" to add a return statement.</p>'
            },
            {
                title: 'Cursor movement',
                body:
                '<p>You can move around the cursor with commands like "up", "next line", or "line one". ' +
                'Try saying "line one".</p>'
            },
            {
                title: 'Deletion',
                body: '<p>Now, to delete the import statement you added earlier, try saying "delete line".</p>'
            },
            {
                title: 'Learn more',
                body:
                "<p>That's it for our introduction! As a next step, take a look at the " +
                '<a href="https://docs.serenade.ai">Serenade guide</a> to learn more.</p>'
            }
        ];
    }

    _suggestions() {
        return [
            'new tab',
            'next tab',
            'previous tab',
            'close tab',
            'go to tab three',
            'next word',
            'next line',
            'previous line',
            'split left',
            'split right',
            'left window',
            'right window',
            'line one',
            'copy next two words',
            'go to phrase hello world',
            'paste',
            'cut function',
            'copy class',
            'delete if',
            'indent line two times',
            'indent next five lines',
            'dedent line',
            'save',
            'style file',
            'undo',
            'redo',
            'copy phrase foobar',
            'change return value to 50',
            'newline',
            'next character',
            'previous word',
            'go to end of line',
            'go to start of word',
            'delete to end of line',
            'delete three words',
            'go to third character',
            'go to second word',
            'delete second argument',
            'copy previous five lines',
            'delete last four words',
            'next class',
            'previous function',
            'go to return value',
            'cut third import',
            'type function',
            'type pascal case hello world',
            'type underscores hello world',
            'type all caps hello world',
            'add argument bar',
            'add function called hello',
            'add parameter foo',
            'add class styler',
            'add import requests',
            'add import numpy as np',
            'add assert false',
            'add decorator app dot get',
            'add return true',
            'add if a less than three',
            'add method init',
            'add return',
            'add while counter greater than zero',
            'add try',
            'add print hi',
            'add function underscore get',
            'add parent class exception',
            'add call say with argument message'
        ];
    }
}
