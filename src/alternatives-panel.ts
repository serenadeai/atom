import BaseAlternativesPanel from './shared/alternatives-panel';

export default class AlternativesPanel extends BaseAlternativesPanel {
    login() {
        return `
<atom-text-editor tabindex="1" class="input-login-email" mini="true"></atom-text-editor>
<atom-text-editor tabindex="2" class="input-login-password" mini="true"></atom-text-editor>
<button class="btn btn-login">
    Sign in
    <div class="lds-ring hidden"><div></div><div></div><div></div><div></div></div>
</button>
<a href="#" class="btn-login-alt btn-pre-register">Or sign up for an account</a>
        `;
    }

    logo() {
        return '<img src="atom://serenade/images/wordmark.png" />';
    }

    register() {
        return `
<atom-text-editor tabindex="1" class="input-register-name" mini="true"></atom-text-editor>
<atom-text-editor tabindex="2" class="input-register-email" mini="true"></atom-text-editor>
<atom-text-editor tabindex="3" class="input-register-password" mini="true"></atom-text-editor>
<button class="btn btn-register">
    Sign up for Serenade
    <div class="lds-ring hidden"><div></div><div></div><div></div><div></div></div>
</button>
        `;
    }
}
