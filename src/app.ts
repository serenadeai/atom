import * as Atom from "atom";
import CommandHandler from "./command-handler";
import IPC from "./ipc";
import Settings from "./settings";

export default class App {
  private commandHandler?: CommandHandler;
  private ipc?: IPC;
  private initialized: boolean = false;
  private settings?: Settings;
  private subscriptions?: Atom.CompositeDisposable;
  private panel?: Atom.Panel;

  private checkInstalled(): boolean {
    const installed = this.settings!.getInstalled();
    if (!installed) {
      this.showInstallMessage();
      return false;
    }

    return true;
  }

  private hideMessage() {
    if (!this.panel) {
      return;
    }

    this.panel!.destroy();
  }

  private showInstallMessage() {
    const message = document.createElement("div");
    message.innerHTML = `
<div class="serenade-message">
  <a href="#" class="serenade-message-close">&times;</a>
  <div class="serenade-message-content">
    <h1>Welcome to Serenade!</h1>
    <p>With Serenade, you can write code faster&mdash;by speaking in plain English, rather than typing. Use Serenade as your coding assistant, or abandon your keyboard entirely.</p>
    <p>To get started, download the Serenade app and run it alongside Atom.</p>
    <a class="serenade-download" href="https://serenade.ai/">Download</a>
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

  private updateActive() {
    this.ipc!.sendActive();
    this.commandHandler!.reloadActiveEditor();
  }

  activate() {
    this.initialize();

    this.subscriptions = new Atom.CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "serenade:initialize": () => this.initialize(),
      })
    );
  }

  deactivate() {
    this.subscriptions!.dispose();
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.settings = new Settings();
    this.commandHandler = new CommandHandler(this.settings);
    this.ipc = new IPC(this.commandHandler, "atom");

    this.ipc.start();
    this.checkInstalled();
    this.commandHandler.pollActiveEditor();
    this.settings.setPluginInstalled("atom");

    atom.workspace.observeTextEditors((editor) => {
      editor.onDidChangeCursorPosition(() => {
        this.updateActive();
      });
    });

    atom.workspace.observeActiveTextEditor((editor) => {
      if (editor) {
        this.updateActive();
      }
    });

    atom.workspace.observeActivePane((pane) => {
      if (pane) {
        this.updateActive();
      }
    });

    atom.workspace.observeActivePaneItem((item) => {
      if (item) {
        this.updateActive();
      }
    });
  }
}
