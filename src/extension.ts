// src/extension.ts
import vscode from './vscode';
import { loadCommands, saveCommands } from './storage';
import { CommandRunnerViewProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('✅ Snippet Manager активирован!');
    
    const provider = new CommandRunnerViewProvider(context);

    // Регистрируем Webview Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CommandRunnerViewProvider.viewType,
            provider
        )
    );

    // Регистрируем команду для открытия панели
    const showCommand = vscode.commands.registerCommand('snippet-manager.showCommands', () => {
        vscode.commands.executeCommand('commandRunnerView.focus');
    });
    context.subscriptions.push(showCommand);

	// Команда для проверки
    const testCommand = vscode.commands.registerCommand('snippet-manager.test', () => {
        vscode.window.showInformationMessage('Snippet Manager работает!');
        // Пытаемся открыть нашу панель
        vscode.commands.executeCommand('commandRunnerView.focus');
	});
	// Команда для отладки - показывает все команды
    const debugCommands = vscode.commands.registerCommand('snippet-manager.debug', () => {
        const commands = loadCommands(context);
        console.log('🐛 ОТЛАДКА: Все команды:', JSON.stringify(commands, null, 2));
        vscode.window.showInformationMessage(`Команд в хранилище: ${commands.length}`);
    });
    
	context.subscriptions.push(testCommand);
	
	// Команда для принудительного удаления всех команд
    const clearAllCommands = vscode.commands.registerCommand('snippet-manager.clearAll', () => {
        const commands = loadCommands(context);
        console.log('🗑️ Принудительное удаление всех команд. Было:', commands.length);
        saveCommands(context, []); 
        vscode.window.showInformationMessage('Все команды удалены');
    });
    context.subscriptions.push(clearAllCommands);

    console.log('✅ Все провайдеры зарегистрированы');
}

export function deactivate() {}