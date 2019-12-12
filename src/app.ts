import * as Atom from "atom";
import BaseApp from "./shared/app";
import CommandHandler from "./command-handler";

export default class App extends BaseApp {
  private subscriptions?: Atom.CompositeDisposable;
  private panel?: Atom.Panel;

  activate() {
    this.initialize();

    this.subscriptions = new Atom.CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "serenade:initialize": () => this.initialize()
      })
    );
  }

  createCommandHandler(): CommandHandler {
    return new CommandHandler(this.settings!);
  }

  deactivate() {
    this.destroy();
    this.subscriptions!.dispose();
  }

  hideMessage() {
    if (!this.panel) {
      return;
    }

    this.panel!.destroy();
  }

  port() {
    return 17375;
  }

  showInstallMessage() {
    const message = document.createElement("div");
    message.innerHTML = `
<div class="serenade-message">
  <a href="#" class="serenade-message-close">&times;</a>
  <div class="serenade-message-content">
    <h1>Welcome to Serenade!</h1>
    <p>With Serenade, you can write code faster&mdash;by speaking in plain English, rather than typing. Use Serenade as your coding assistant, or abandon your keyboard entirely.</p>
    <p>To get started, download the Serenade app and run it alongside Atom.</p>
    <a class="serenade-download" href="https://serenade.ai/request">Download</a>
  </div>
</div>`;

    message.querySelector(".serenade-message-close")!.addEventListener("click", (e: any) => {
      e.preventDefault();
      this.hideMessage();
    });

    message.querySelector(".serenade-download")!.addEventListener("click", () => {
      this.hideMessage();
    });

    this.panel = atom.workspace.addRightPanel({ item: message });
  }

  async initialize() {
    if (this.ipc) {
      return;
    }

    this.run();
    (this.commandHandler! as CommandHandler).pollActiveEditor();
  }
}
