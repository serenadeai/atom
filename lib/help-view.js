'use babel';

export default class AlertView {
    constructor(serializedState) {
        // create container
        this.container = document.createElement('div');
        this.container.classList.add('help-panel');
        this.container.innerHTML = this.html();

        // create close button
        this.close = document.createElement('a');
        this.close.classList.add('btn-close');
        this.close.innerHTML = "&times;";
        this.close.addEventListener('click', (e) => {
            this.hide();
        });
        this.container.appendChild(this.close);

        // create native atom panel at top of editor
        this.panel = atom.workspace.addRightPanel({
            item: this.container,
            visible: false
        });
    }

    html() {
        return `
<h1>Serenade Help</h1>
<p>Serenade lets you code with your voice. Let's walk through some of the commands that Serenade supports.</p>
<h2>Controls</h2>
<p>We'll start with the basics. Here are a few commands you can say to control the editor:</p>
<ul>
    <li>new tab</li>
    <li>open hello.py</li>
    <li>close tab</li>
    <li>next tab</li>
    <li>save</li>
    <li>undo</li>
    <li>split right</li>
    <li>right window</li>
</ul>
<h2>Selectors</h2>
<p>Now, let's move on to editing. Serenade defines a variety of <i>selectors</i>, or ways of selecting ranges of text, that you can use to navigate files and edit text. If you've ever used vim, this concept should be pretty familiar already. The most basic selectors can be used on any file:</p>
<ul>
    <li>block</li>
    <li>character</li>
    <li>line</li>
    <li>word</li>
</ul>
<p>For example, you could say "go to line 1" to move your cursor to the start of the first line of the current file, or "delete next word" to remove the word after your cursor. More on that soon.</p>
<p>You can also select code based on the language you're editing. In fact, you can select nearly any language construct. For instance, try selecting things like:</p>
<ul>
    <li>class</li>
    <li>for</li>
    <li>function</li>
    <li>if</li>
    <li>return value</li>
    <li>statement</li>
    <li>while</li>
    <li>3rd argument</li>
</ul>
<h2>Navigation</h2>
<p>You can use any selector to navigate the file you're editing:</p>
<ul>
    <li>go to function</li>
    <li>go to line 50</li>
    <li>next line</li>
    <li>previous word</li>
    <li>next 3 characters</li>
</ul>
<p>For brevity, "go to" is actually optional in all of the examples above, to save you a few syllables (but you can still say it, if that feels more natural).</p>
<h2>Editing</h2>
<p>Selectors can also be used to manipulate text:</p>
<ul>
    <li>copy block</li>
    <li>cut line</li>
    <li>change character to t</li>
    <li>delete class</li>
    <li>paste</li>
</ul>
<p>You can also refer to ranges using any selector:</p>
<ul>
    <li>copy next 3 blocks</li>
    <li>cut to line 75</li>
    <li>delete lines 76 to 164</li>
</ul>
<h2>Adding text</h2>
<p>Now that we've covered editing text, let's explore adding text. The most basic way to add text is to say "type" followed by the text you want to add:</p>
<ul>
    <li>type hello</li>
    <li>type in quotes world</li>
    <li>type camel case some value equals all caps another value</li>
</ul>
<p>You can also add entire language constructs with the "add" command:</p>
<ul>
    <li>add class hello</li>
    <li>add function say with parameter message</li>
    <li>add argument n at position 2</li>
</ul>
<h2>Alternatives</h2>
<p>Sometimes, Serenade isn't 100% sure what you said. When that happens, you'll see a number list of possible commands that looks like this:</p>
<img src="atom://serenade-atom/images/alternatives-cropped.png" style="width: 250px" />
<p>Now, if you'd like to run the second command in the list, just say "use 2". If you don't say anything, then the first command in the list will be executed as soon as the progress bar fills up.</p>
<p>If you say something that isn't a valid command, then you'll see the below:</p>
<img src="atom://serenade-atom/images/invalid-cropped.png" style="width: 250px" />
        `;
    }

    destroy() {
        this.element.destroy();
    }

    hide() {
        this.panel.hide();
    }

    serialize() {}

    show() {
        this.panel.show();
    }

    visible() {
        return this.panel.isVisible();
    }
}
