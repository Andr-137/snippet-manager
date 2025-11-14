"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// src/extension.ts
const vscode_1 = __importDefault(require("./vscode"));
const storage_1 = require("./storage");
const webviewProvider_1 = require("./webviewProvider");
function activate(context) {
    console.log('✅ Snippet Manager активирован!');
    const provider = new webviewProvider_1.CommandRunnerViewProvider(context);
    // Регистрируем Webview Provider
    context.subscriptions.push(vscode_1.default.window.registerWebviewViewProvider(webviewProvider_1.CommandRunnerViewProvider.viewType, provider));
    // Регистрируем команду для открытия панели
    const showCommand = vscode_1.default.commands.registerCommand('snippet-manager.showCommands', () => {
        vscode_1.default.commands.executeCommand('commandRunnerView.focus');
    });
    context.subscriptions.push(showCommand);
    // Команда для проверки
    const testCommand = vscode_1.default.commands.registerCommand('snippet-manager.test', () => {
        vscode_1.default.window.showInformationMessage('Snippet Manager работает!');
        // Пытаемся открыть нашу панель
        vscode_1.default.commands.executeCommand('commandRunnerView.focus');
    });
    // Команда для отладки - показывает все команды
    const debugCommands = vscode_1.default.commands.registerCommand('snippet-manager.debug', () => {
        const commands = (0, storage_1.loadCommands)(context);
        console.log('🐛 ОТЛАДКА: Все команды:', JSON.stringify(commands, null, 2));
        vscode_1.default.window.showInformationMessage(`Команд в хранилище: ${commands.length}`);
    });
    context.subscriptions.push(testCommand);
    // Команда для принудительного удаления всех команд
    const clearAllCommands = vscode_1.default.commands.registerCommand('snippet-manager.clearAll', () => {
        const commands = (0, storage_1.loadCommands)(context);
        console.log('🗑️ Принудительное удаление всех команд. Было:', commands.length);
        (0, storage_1.saveCommands)(context, []);
        vscode_1.default.window.showInformationMessage('Все команды удалены');
    });
    context.subscriptions.push(clearAllCommands);
    console.log('✅ Все провайдеры зарегистрированы');
}
function deactivate() { }
//# sourceMappingURL=extension.js.map