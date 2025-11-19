"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRunnerViewProvider = void 0;
// src/webviewProvider.ts
const vscode_1 = __importDefault(require("./vscode"));
const storage_1 = require("./storage");
const i18n_1 = require("./i18n");
class CommandRunnerViewProvider {
    constructor(_context) {
        this._context = _context;
        console.log('✅ CommandRunnerViewProvider создан');
    }
    resolveWebviewView(webviewView, _context, _token) {
        try {
            console.log('🔍 resolveWebviewView вызван');
            this._view = webviewView;
            if (!webviewView.webview) {
                console.error('❌ WebviewView.webview не инициализирован');
                return;
            }
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this._context.extensionUri],
            };
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
            // Обработка сообщений из веб-вью
            webviewView.webview.onDidReceiveMessage(async (message) => {
                console.log('📥 Получено сообщение от webview:', message);
                try {
                    switch (message.command) {
                        case 'loadCommands':
                            await this._refresh();
                            break;
                        case 'saveCommand':
                            await this._saveCommand(message.item);
                            break;
                        case 'deleteCommand':
                            console.log('🗑️ Удаление команды:', message.id, message.title);
                            await this._deleteCommand(message.id, message.title);
                            break;
                        case 'runCommand':
                            console.log('🚀 Запуск команды в терминале:', message.commandText);
                            console.log('🕒 Время:', new Date().toISOString());
                            await this._runCommandInTerminal(message.commandText);
                            break;
                        case 'changeLanguage':
                            await this._changeLanguage(message.language);
                            break;
                        case 'moveUp':
                            await this._moveCommand(message.id, 'up');
                            break;
                        case 'moveDown':
                            await this._moveCommand(message.id, 'down');
                            break;
                    }
                }
                catch (error) {
                    console.error('❌ Ошибка обработки сообщения:', error);
                }
            });
            // Первоначальная загрузка команд
            this._refresh();
        }
        catch (error) {
            console.error('❌ Ошибка в resolveWebviewView:', error);
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'string') {
                errorMessage = error;
            }
            else {
                errorMessage = 'Неизвестная ошибка';
            }
            webviewView.webview.html = this._getErrorHtml(error);
        }
    }
    async _changeLanguage(language) {
        await i18n_1.i18n.setLanguage(language);
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            await this._refresh();
        }
    }
    async _refresh() {
        if (!this._view) {
            return;
        }
        try {
            const commands = (0, storage_1.loadCommands)(this._context);
            const translation = i18n_1.i18n.getTranslation();
            this._view.webview.postMessage({
                type: 'refreshCommands',
                commands: commands,
                translation: translation
            });
        }
        catch (error) {
            console.error('❌ Ошибка в _refresh:', error);
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else {
                errorMessage = String(error);
            }
            vscode_1.default.window.showErrorMessage(`Ошибка обновления: ${errorMessage}`);
        }
    }
    async _saveCommand(item) {
        try {
            const commands = (0, storage_1.loadCommands)(this._context);
            if (item.id && item.id !== '') {
                const existingIndex = commands.findIndex(c => String(c.id) === String(item.id));
                if (existingIndex >= 0) {
                    commands[existingIndex] = item;
                }
                else {
                    item.id = Date.now().toString();
                    commands.push(item);
                }
            }
            else {
                item.id = Date.now().toString();
                commands.push(item);
            }
            (0, storage_1.saveCommands)(this._context, commands);
            await this._refresh();
            vscode_1.default.window.showInformationMessage(i18n_1.i18n.getTranslation().messages.saved);
        }
        catch (error) {
            console.error('❌ Ошибка при сохранении:', error);
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else {
                errorMessage = String(error);
            }
            vscode_1.default.window.showErrorMessage('Ошибка при сохранении команды');
        }
    }
    async _deleteCommand(id, title) {
        try {
            console.log('🗑️ Удаление команды с ID:', id, 'Название:', title);
            const commands = (0, storage_1.loadCommands)(this._context);
            console.log('📝 Команд до удаления:', commands.length);
            const filteredCommands = commands.filter(c => {
                const shouldKeep = String(c.id) !== String(id);
                console.log(`🔍 Сравниваем: "${c.id}" с "${id}" -> ${shouldKeep ? 'сохраняем' : 'УДАЛЯЕМ'}`);
                return shouldKeep;
            });
            console.log('📝 Команд после удаления:', filteredCommands.length);
            if (filteredCommands.length === commands.length) {
                console.log('❌ Команда не найдена для удаления!');
                vscode_1.default.window.showWarningMessage('Команда для удаления не найдена');
                return;
            }
            (0, storage_1.saveCommands)(this._context, filteredCommands);
            await this._refresh();
            console.log('✅ Команда успешно удалена');
            vscode_1.default.window.showInformationMessage(i18n_1.i18n.getTranslation().messages.deleted);
        }
        catch (error) {
            console.error('❌ Ошибка при удалении:', error);
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else {
                errorMessage = String(error);
            }
            vscode_1.default.window.showErrorMessage('Ошибка при удалении команды');
        }
    }
    async _runCommandInTerminal(commandText) {
        try {
            if (!commandText || commandText.trim() === '') {
                vscode_1.default.window.showWarningMessage(i18n_1.i18n.getTranslation().messages.emptyCommand);
                return;
            }
            const config = vscode_1.default.workspace.getConfiguration('snippetManager');
            const focusTerminal = config.get('focusTerminal', true);
            const executeCommand = config.get('executeCommand', false);
            let terminal = vscode_1.default.window.terminals.find(t => t.name === 'Command Runner');
            if (!terminal) {
                terminal = vscode_1.default.window.createTerminal('Command Runner');
                console.log('🆕 Создан новый терминал "Command Runner"');
            }
            // Показываем терминал и переводим фокус
            terminal.show(false);
            // Небольшая задержка для гарантии, что терминал готов
            await new Promise(resolve => setTimeout(resolve, 50));
            // ВАЖНО: Вставляем команду БЕЗ выполнения (false)
            terminal.sendText(commandText, executeCommand);
            console.log(`📝 Команда "${commandText}" ${executeCommand ? 'выполнена' : 'вставлена'} в терминал`);
            // Дополнительные меры для гарантии фокуса
            if (focusTerminal) {
                setTimeout(async () => {
                    try {
                        // Используем встроенную команду VS Code для фокусировки терминала
                        await vscode_1.default.commands.executeCommand('workbench.action.terminal.focus');
                        console.log('🎯 Фокус переведен на терминал');
                    }
                    catch (focusError) {
                        console.warn('⚠️ Не удалось перевести фокус командой:', focusError);
                        // Резервный способ
                        terminal.show(true);
                    }
                }, 100);
            }
            // Показываем информационное сообщение
            if (executeCommand) {
                vscode_1.default.window.showInformationMessage(i18n_1.i18n.getTranslation().messages.commandExecuted);
            }
            else {
                vscode_1.default.window.showInformationMessage(i18n_1.i18n.getTranslation().messages.commandInserted);
            }
        }
        catch (error) {
            console.error('❌ Ошибка при работе с терминалом:', error);
            // Безопасное преобразование ошибки в строку
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'string') {
                errorMessage = error;
            }
            else {
                errorMessage = String(error);
            }
            vscode_1.default.window.showErrorMessage(`${i18n_1.i18n.getTranslation().messages.error}: ${errorMessage}`);
        }
    }
    _getHtmlForWebview(webview) {
        const t = i18n_1.i18n.getTranslation();
        const currentLanguage = i18n_1.i18n.getCurrentLanguage();
        const html = `
        <!DOCTYPE html>
        <html lang="${currentLanguage}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Command Runner</title>
            <style>
                /* Cтили */
                body { 
                    font-family: var(--vscode-font-family); 
                    margin: 0; 
                    padding: 0; 
                    padding-top: 60px;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                }
                .header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50px;
                    background: var(--vscode-titleBar-activeBackground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 10px;
                    z-index: 1000;
                }
                .language-switcher {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }
                .language-option {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    cursor: pointer;
                }
                .vscode-radio {
                    width: 16px;
                    height: 16px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .vscode-radio.checked::after {
                    content: '';
                    width: 8px;
                    height: 8px;
                    background: var(--vscode-button-background);
                    border-radius: 50%;
                }
                .add-button {
                    background: none;
                    border: none;
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    padding: 5px;
                    font-size: 24px;
                }
                .content {
                    padding: 10px;
                }
                .command-item {
                    border: 1px solid var(--vscode-panel-border);
                    padding-top: 10px;
                    padding-left: 10px;
                    padding-right: 5px;
                    padding-bottom: 10px;
                    margin-bottom: 4px;
                    border-radius: 3px;
                    background: var(--vscode-panel-background);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                }
                .command-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .command-item.active {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .command-actions {
                    position: relative;
                }
                .command-title {
                    font-weight: bold; 
                    cursor: pointer;
                    padding: 4px 0;
                    color: var(--vscode-textLink-foreground);
                    flex-grow: 1;
                }

                /* Стили для меню */
                .menu-item {
                    position: absolute;
                    top: -7px;
                    right: 20px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                    padding: 5px;
                    z-index: 10;
                    display: none;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                .wrapp-menu-item {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .menu-item-shift {
                    display: flex;
                    flex-direction: row;
                    gap: 5px;
                }
                .menu-item-block {
                    display: flex;
                    gap: 5px;
                }
                .dots {
                    width: 18px;
                    height: 18px;
                    background: none;
                    border: none;
                    padding: 4px;
                    border-radius: 3px;
                    cursor: pointer;
                    color: var(--vscode-button-foreground);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .action-button {
                    background: none;
                    border: none;
                    padding: 4px;
                    border-radius: 3px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;

                }
                .action-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .arrow-buttom-top, .arrow-buttom-bottom {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .edit-botton {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .delete-botton {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }
                .arrow {
                    width: 14px;
                    height: 14px;
                }
                .edit, .delete {
                    width: 14px;
                    height: 14px;
                }

                /* Модальные окна */
                .modal-overlay {
                    position: fixed;
                    top: 50px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    z-index: 2000;
                }
                .modal {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 10px;
                    width: 98%;
                    max-width: 500px;
                    margin-top: 20px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group input {
                    width: 95%;
                    padding-top: 8px;
                    padding-left: 8px;
                    padding-right: 3px;
                    padding-bottom: 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }
                .modal-footer {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    margin-top: 15px;
                }
                .modal-footer button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .btn-primary {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .btn-secondary {
                    background: transparent;
                    border: 1px solid var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .btn-danger {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }
                .hidden {
                    display: none;
                }
                .no-commands {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <!-- SVG спрайт с иконками -->
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: none;">
                <symbol id="icon-arrow-bottom" viewBox="0 0 438.533 438.533" fill="#fff">
                <path d="M409.133,109.203c-19.608-33.592-46.205-60.189-79.798-79.796C295.736,9.801,259.058,0,219.273,0 c-39.781,0-76.47,9.801-110.063,29.407c-33.595,19.604-60.192,46.201-79.8,79.796C9.801,142.8,0,179.489,0,219.267 c0,39.78,9.804,76.463,29.407,110.062c19.607,33.592,46.204,60.189,79.799,79.798c33.597,19.605,70.283,29.407,110.063,29.407 s76.47-9.802,110.065-29.407c33.593-19.602,60.189-46.206,79.795-79.798c19.603-33.596,29.403-70.284,29.403-110.062 C438.533,179.485,428.732,142.795,409.133,109.203z M361.449,232.399L258.1,335.755l-25.98,25.981 c-3.426,3.422-7.707,5.133-12.849,5.133c-5.136,0-9.419-1.711-12.847-5.133l-25.981-25.981L77.086,232.399 c-3.422-3.43-5.137-7.707-5.137-12.849c0-5.137,1.709-9.42,5.137-12.847l25.981-25.981c3.621-3.617,7.9-5.424,12.85-5.424 c4.952,0,9.235,1.807,12.85,5.424l53.959,53.955V91.36c0-4.949,1.809-9.233,5.426-12.847c3.616-3.618,7.898-5.428,12.847-5.428 h36.547c4.948,0,9.233,1.81,12.847,5.428c3.614,3.614,5.428,7.898,5.428,12.847v143.318l53.954-53.955 c3.429-3.427,7.703-5.14,12.847-5.14c5.141,0,9.421,1.713,12.847,5.14l25.981,25.981c3.432,3.427,5.14,7.71,5.14,12.847 C366.589,224.692,364.881,228.974,361.449,232.399z"/>
                </symbol>
                <symbol id="icon-arrow-top" viewBox="0 0 438.533 438.533" fill="#fff">
                <path d="M409.133,109.203c-19.608-33.592-46.205-60.189-79.798-79.796C295.736,9.801,259.058,0,219.273,0 c-39.781,0-76.47,9.801-110.063,29.407c-33.595,19.604-60.192,46.201-79.8,79.796C9.801,142.8,0,179.489,0,219.267 c0,39.78,9.804,76.463,29.407,110.062c19.607,33.592,46.204,60.189,79.799,79.798c33.597,19.605,70.283,29.407,110.063,29.407 s76.47-9.802,110.065-29.407c33.593-19.602,60.189-46.206,79.795-79.798c19.603-33.596,29.403-70.284,29.403-110.062 C438.533,179.485,428.732,142.795,409.133,109.203z M361.449,231.831l-25.981,25.981c-3.613,3.613-7.901,5.42-12.847,5.42 c-4.948,0-9.229-1.807-12.847-5.42l-53.954-53.961v143.32c0,4.948-1.813,9.232-5.428,12.847c-3.613,3.62-7.898,5.427-12.847,5.427 h-36.547c-4.948,0-9.231-1.807-12.847-5.427c-3.617-3.614-5.426-7.898-5.426-12.847v-143.32l-53.959,53.961 c-3.431,3.425-7.708,5.133-12.85,5.133c-5.14,0-9.423-1.708-12.85-5.133l-25.981-25.981c-3.422-3.429-5.137-7.714-5.137-12.852 c0-5.137,1.709-9.419,5.137-12.847l103.356-103.353l25.981-25.981c3.427-3.425,7.71-5.14,12.847-5.14 c5.142,0,9.423,1.715,12.849,5.14l25.98,25.981l103.35,103.353c3.432,3.427,5.14,7.71,5.14,12.847 C366.589,224.117,364.881,228.402,361.449,231.831z"/>
                </symbol>
                <symbol id="icon-delete" viewBox="0 0 16 16" fill="#fff">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" /> 
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                </symbol>
                <symbol id="icon-edit" viewBox="0 0 16 16" fill="#fff">
                <path d="M15.2 6l-1.1-0.2c-0.1-0.2-0.1-0.4-0.2-0.6l0.6-0.9 0.5-0.7-2.6-2.6-0.7 0.5-0.9 0.6c-0.2-0.1-0.4-0.1-0.6-0.2l-0.2-1.1-0.2-0.8h-3.6l-0.2 0.8-0.2 1.1c-0.2 0.1-0.4 0.1-0.6 0.2l-0.9-0.6-0.7-0.4-2.5 2.5 0.5 0.7 0.6 0.9c-0.2 0.2-0.2 0.4-0.3 0.6l-1.1 0.2-0.8 0.2v3.6l0.8 0.2 1.1 0.2c0.1 0.2 0.1 0.4 0.2 0.6l-0.6 0.9-0.5 0.7 2.6 2.6 0.7-0.5 0.9-0.6c0.2 0.1 0.4 0.1 0.6 0.2l0.2 1.1 0.2 0.8h3.6l0.2-0.8 0.2-1.1c0.2-0.1 0.4-0.1 0.6-0.2l0.9 0.6 0.7 0.5 2.6-2.6-0.5-0.7-0.6-0.9c0.1-0.2 0.2-0.4 0.2-0.6l1.1-0.2 0.8-0.2v-3.6l-0.8-0.2zM15 9l-1.7 0.3c-0.1 0.5-0.3 1-0.6 1.5l0.9 1.4-1.4 1.4-1.4-0.9c-0.5 0.3-1 0.5-1.5 0.6l-0.3 1.7h-2l-0.3-1.7c-0.5-0.1-1-0.3-1.5-0.6l-1.4 0.9-1.4-1.4 0.9-1.4c-0.3-0.5-0.5-1-0.6-1.5l-1.7-0.3v-2l1.7-0.3c0.1-0.5 0.3-1 0.6-1.5l-1-1.4 1.4-1.4 1.4 0.9c0.5-0.3 1-0.5 1.5-0.6l0.4-1.7h2l0.3 1.7c0.5 0.1 1 0.3 1.5 0.6l1.4-0.9 1.4 1.4-0.9 1.4c0.3 0.5 0.5 1 0.6 1.5l1.7 0.3v2z"> </path> 
                    <path d="M8 4.5c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5c0-1.9-1.6-3.5-3.5-3.5zM8 10.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5c0 1.4-1.1 2.5-2.5 2.5z"> </path>
                </symbol>
                <symbol id="icon-menu" viewBox="0 0 256 256" fill="#fff">
                    <path d="M116,64a12,12,0,1,1,12,12A12.01375,12.01375,0,0,1,116,64Zm12,52a12,12,0,1,0,12,12A12.01375,12.01375,0,0,0,128,116Zm0,64a12,12,0,1,0,12,12A12.01375,12.01375,0,0,0,128,180Z" />
                </symbol>
            </svg>

            <div class="header">
            <div class="language-switcher">
                <span>${t.header.language}:</span>
                <div class="language-option" onclick="changeLanguage('ru')">
                    <div class="vscode-radio ${currentLanguage === 'ru' ? 'checked' : ''}"></div>
                    <span>RU</span>
                </div>
                <div class="language-option" onclick="changeLanguage('en')">
                    <div class="vscode-radio ${currentLanguage === 'en' ? 'checked' : ''}"></div>
                    <span>EN</span>
                </div>
            </div>
            <button class="add-button" onclick="openAddModal()" title="${t.header.add}">＋</button>
        </div>

        <div class="content">
            <div class="command-list" id="commandList">
                <div class="no-commands">${t.messages.noCommands}</div>
            </div>
        </div>

        <!-- Модальные окна -->
        <div id="modalOverlay" class="modal-overlay hidden">
            <div class="modal">
                <div class="form-group">
                    <input type="text" id="modalTitleInput" placeholder="${t.form.title}">
                </div>
                <div class="form-group">
                    <input type="text" id="modalCommandInput" placeholder="${t.form.command}">
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">${t.form.cancel}</button>
                    <button class="btn-primary" onclick="saveModal()">${t.form.save}</button>
                </div>
            </div>
        </div>

        <div id="deleteConfirmOverlay" class="modal-overlay hidden">
            <div class="modal">
                <p id="deleteConfirmMessage">${t.messages.deleteConfirm}</p>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="hideDeleteConfirm()">${t.form.cancel}</button>
                    <button class="btn-danger" onclick="confirmDelete()">${t.commands.delete}</button>
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let currentCommands = [];
            let currentTranslation = ${JSON.stringify(t)};
            let editingId = '';
            let pendingDeleteId = null;
            let pendingDeleteTitle = null;
            let activeIndex = -1;
            let commandItems = [];
            let lastOpenedMenu = null;

            function updateList(commands, translation) {
                if (translation) {
                    currentTranslation = translation;
                }
                
                const list = document.getElementById('commandList');
                list.innerHTML = '';
                
                if (commands.length === 0) {
                    list.innerHTML = '<div class="no-commands">' + currentTranslation.messages.noCommands + '</div>';
                    commandItems = [];
                    activeIndex = -1;
                    lastOpenedMenu = null;
                    return;
                }
                
                currentCommands = commands;
                commandItems = [];
                
                commands.forEach((cmd, index) => {
                    const item = document.createElement('div');
                    item.className = 'command-item';
                    item.setAttribute('data-index', index);
                    item.setAttribute('data-command-id', cmd.id);
                    
                    // Экранируем специальные символы
                    const safeTitle = cmd.title.replace(/'/g, "\\\\'").replace(/"/g, "&quot;");
                    const safeCommand = cmd.command.replace(/'/g, "\\\\'").replace(/"/g, "&quot;");
                    
                    // Создаем HTML структуру без дублирующих обработчиков
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'command-title';
                    titleDiv.textContent = cmd.title;
                    
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'command-actions';
                    
                    const dotsContainer = document.createElement('div');
                    dotsContainer.className = 'action-dots';
                    
                    const dotsButton = document.createElement('button');
                    dotsButton.className = 'dots';
                    dotsButton.title = currentTranslation.commands.menu;
                    dotsButton.innerHTML = '<svg width="18" height="18" fill="#fff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M116,64a12,12,0,1,1,12,12A12.01375,12.01375,0,0,1,116,64Zm12,52a12,12,0,1,0,12,12A12.01375,12.01375,0,0,0,128,116Zm0,64a12,12,0,1,0,12,12A12.01375,12.01375,0,0,0,128,180Z" /></svg>';
                    
                    const menuItem = document.createElement('div');
                    menuItem.className = 'menu-item';
                    
                    const wrapperDiv = document.createElement('div');
                    wrapperDiv.className = 'wrapp-menu-item';
                    
                    const shiftDiv = document.createElement('div');
                    shiftDiv.className = 'menu-item-shift';
                    
                    // Кнопка перемещения вверх
                    const upButton = document.createElement('button');
                    upButton.className = 'action-button arrow-buttom-top';
                    upButton.title = currentTranslation.commands.top;
                    upButton.disabled = index === 0;
                    if (index === 0) {
                        upButton.style.opacity = '0.5';
                    }
                    upButton.innerHTML = '<svg class="arrow"><use href="#icon-arrow-top"></use></svg>';
                    
                    // Кнопка перемещения вниз
                    const downButton = document.createElement('button');
                    downButton.className = 'action-button arrow-buttom-bottom';
                    downButton.title = currentTranslation.commands.down;
                    downButton.disabled = index === commands.length - 1;
                    if (index === commands.length - 1) {
                        downButton.style.opacity = '0.5';
                    }
                    downButton.innerHTML = '<svg class="arrow"><use href="#icon-arrow-bottom"></use></svg>';
                    
                    const blockDiv = document.createElement('div');
                    blockDiv.className = 'menu-item-block';
                    
                    // Кнопка редактирования
                    const editButton = document.createElement('button');
                    editButton.className = 'action-button edit-botton';
                    editButton.title = currentTranslation.commands.edit;
                    editButton.innerHTML = '<svg class="edit"><use href="#icon-edit"></use></svg>';
                    
                    // Кнопка удаления
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'action-button delete-botton';
                    deleteButton.title = currentTranslation.commands.delete;
                    deleteButton.innerHTML = '<svg class="delete"><use href="#icon-delete"></use></svg>';
                    
                    // Собираем структуру
                    shiftDiv.appendChild(upButton);
                    shiftDiv.appendChild(downButton);
                    
                    blockDiv.appendChild(editButton);
                    blockDiv.appendChild(deleteButton);
                    
                    wrapperDiv.appendChild(shiftDiv);
                    wrapperDiv.appendChild(blockDiv);
                    
                    menuItem.appendChild(wrapperDiv);
                    dotsContainer.appendChild(dotsButton);
                    dotsContainer.appendChild(menuItem);
                    actionsDiv.appendChild(dotsContainer);
                    
                    item.appendChild(titleDiv);
                    item.appendChild(actionsDiv);
                    
                    list.appendChild(item);
                    commandItems.push(item);
                    
                    // Обработчики событий
                    dotsButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        toggleMenu(dotsButton, e);
                    });
                    
                    upButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        moveUp(cmd.id, e);
                    });
                    
                    downButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        moveDown(cmd.id, e);
                    });
                    
                    editButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        openEditModal(cmd.id, safeTitle, safeCommand, e);
                    });
                    
                    deleteButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        showDeleteConfirm(cmd.id, safeTitle, e);
                    });
                    
                    // ОДИН обработчик на весь элемент команды
                    item.addEventListener('click', function(e) {
                        // Проверяем, что клик был не по кнопкам меню и не по самому меню
                        if (!e.target.closest('.command-actions') && 
                            !e.target.closest('.menu-item')) {
                            runCommand(cmd.command);
                        }
                    });
                });
                
                // Восстанавливаем открытое меню после обновления списка
                if (lastOpenedMenu) {
                    const menuElement = document.querySelector('[data-command-id="' + lastOpenedMenu + '"] .menu-item');
                    if (menuElement) {
                        menuElement.style.display = 'block';
                    }
                }
                
                // Устанавливаем активный элемент
                if (commandItems.length > 0) {
                    setActive(0);
                }
            }

            function setActive(index) {
                commandItems.forEach(item => item.classList.remove('active'));
                if (index >= 0 && index < commandItems.length) {
                    commandItems[index].classList.add('active');
                    activeIndex = index;
                }
            }

            function toggleMenu(button, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                
                const menu = button.parentElement.querySelector('.menu-item');
                const isVisible = menu.style.display === 'block';
                const commandId = button.closest('.command-item').getAttribute('data-command-id');
                
                // Скрываем все меню
                document.querySelectorAll('.menu-item').forEach(m => {
                    m.style.display = 'none';
                });
                
                // Показываем/скрываем текущее меню
                menu.style.display = isVisible ? 'none' : 'block';
                
                // Сохраняем ID команды для восстановления меню после обновления
                if (!isVisible) {
                    lastOpenedMenu = commandId;
                } else {
                    lastOpenedMenu = null;
                }
            }

            // Функции перемещения
            function moveUp(id, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                console.log('Перемещение вверх команды:', id);
                vscode.postMessage({
                    command: 'moveUp',
                    id: id
                });
            }

            function moveDown(id, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                console.log('Перемещение вниз команды:', id);
                vscode.postMessage({
                    command: 'moveDown',
                    id: id
                });
            }

            // Остальные функции (openEditModal, showDeleteConfirm, runCommand и т.д.)
            function openEditModal(id, title, command, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                editingId = id;
                document.getElementById('modalTitleInput').value = title;
                document.getElementById('modalCommandInput').value = command;
                document.getElementById('modalOverlay').classList.remove('hidden');
                // Закрываем меню после открытия модального окна
                lastOpenedMenu = null;
                document.querySelectorAll('.menu-item').forEach(menu => {
                    menu.style.display = 'none';
                });
            }

            function showDeleteConfirm(id, title, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                pendingDeleteId = id;
                pendingDeleteTitle = title;
                
                const message = currentTranslation.messages.deleteConfirm.replace('{title}', title);
                document.getElementById('deleteConfirmMessage').textContent = message;
                document.getElementById('deleteConfirmOverlay').classList.remove('hidden');
                // Закрываем меню после открытия диалога подтверждения
                lastOpenedMenu = null;
                document.querySelectorAll('.menu-item').forEach(menu => {
                    menu.style.display = 'none';
                });
            }

            function openAddModal() {
                editingId = '';
                document.getElementById('modalTitleInput').value = '';
                document.getElementById('modalCommandInput').value = '';
                document.getElementById('modalOverlay').classList.remove('hidden');
            }

            function closeModal() {
                document.getElementById('modalOverlay').classList.add('hidden');
            }

            function saveModal() {
                const title = document.getElementById('modalTitleInput').value.trim();
                const command = document.getElementById('modalCommandInput').value.trim();
                
                if (!title) {
                    alert('Введите название команды');
                    return;
                }
                if (!command) {
                    alert('Введите команду');
                    return;
                }
                
                vscode.postMessage({
                    command: 'saveCommand',
                    item: { id: editingId, title, command }
                });
                closeModal();
            }

            function hideDeleteConfirm() {
                document.getElementById('deleteConfirmOverlay').classList.add('hidden');
                pendingDeleteId = null;
                pendingDeleteTitle = null;
            }

            function confirmDelete() {
                if (pendingDeleteId) {
                    vscode.postMessage({
                        command: 'deleteCommand',
                        id: pendingDeleteId,
                        title: pendingDeleteTitle
                    });
                    hideDeleteConfirm();
                }
            }

            function runCommand(cmd) {
                console.log('🚀 Запуск команды:', cmd, 'Время:', new Date().toISOString());
                vscode.postMessage({
                    command: 'runCommand', 
                    commandText: cmd 
                });
            }

            function changeLanguage(lang) {
                vscode.postMessage({
                    command: 'changeLanguage',
                    language: lang
                });
            }

            // Навигация по клавишам
            document.addEventListener('keydown', function(e) {
                if (commandItems.length === 0) return;
                
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        if (activeIndex > 0) {
                            setActive(activeIndex - 1);
                        }
                        break;
                    
                    case 'ArrowDown':
                        e.preventDefault();
                        if (activeIndex < commandItems.length - 1) {
                            setActive(activeIndex + 1);
                        }
                        break;
                    
                    case 'Enter':
                        e.preventDefault();
                        if (activeIndex >= 0) {
                            const cmd = currentCommands[activeIndex];
                            if (cmd) {
                                runCommand(cmd.command);
                            }
                        }
                        break;
                }
            });

            // Загрузка при открытии
            vscode.postMessage({ command: 'loadCommands' });

            // Обработка сообщений из расширения
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'refreshCommands') {
                    currentCommands = message.commands;
                    updateList(message.commands, message.translation);
                }
            });

            // Закрытие модальных окон
            document.getElementById('modalOverlay').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });

            document.getElementById('deleteConfirmOverlay').addEventListener('click', function(e) {
                if (e.target === this) {
                    hideDeleteConfirm();
                }
            });

            // Закрытие по ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    hideDeleteConfirm();
                    // Также закрываем все меню при ESC
                    document.querySelectorAll('.menu-item').forEach(menu => {
                        menu.style.display = 'none';
                    });
                    lastOpenedMenu = null;
                }
            });

            // Скрываем меню при клике вне его
            document.addEventListener('click', function() {
                document.querySelectorAll('.menu-item').forEach(menu => {
                    menu.style.display = 'none';
                });
                lastOpenedMenu = null;
            });
        </script>
        </body>
        </html>
        `;
        return html;
    }
    _getErrorHtml(error) {
        let errorMessage;
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else if (typeof error === 'string') {
            errorMessage = error;
        }
        else {
            errorMessage = String(error);
        }
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    padding: 20px;
                    color: var(--vscode-errorForeground);
                }
            </style>
        </head>
        <body>
            <h3>Ошибка загрузки расширения</h3>
            <p>${errorMessage}</p>
            <button onclick="location.reload()">Перезагрузить</button>
        </body>
        </html>`;
    }
    async _moveCommand(id, direction) {
        try {
            console.log(`🔄 Перемещение команды ${id} ${direction === 'up' ? 'вверх' : 'вниз'}`);
            const commands = (0, storage_1.loadCommands)(this._context);
            const currentIndex = commands.findIndex(c => c.id === id);
            if (currentIndex === -1) {
                console.log('❌ Команда для перемещения не найдена');
                return;
            }
            let newIndex;
            if (direction === 'up') {
                // Перемещение вверх
                if (currentIndex === 0) {
                    console.log('⚠️ Команда уже вверху');
                    return;
                }
                newIndex = currentIndex - 1;
            }
            else {
                // Перемещение вниз
                if (currentIndex === commands.length - 1) {
                    console.log('⚠️ Команда уже внизу');
                    return;
                }
                newIndex = currentIndex + 1;
            }
            // Меняем команды местами
            [commands[currentIndex], commands[newIndex]] = [commands[newIndex], commands[currentIndex]];
            (0, storage_1.saveCommands)(this._context, commands);
            await this._refresh();
            console.log('✅ Команда успешно перемещена');
        }
        catch (error) {
            console.error('❌ Ошибка при перемещении команды:', error);
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else {
                errorMessage = String(error);
            }
            vscode_1.default.window.showErrorMessage('Ошибка при перемещении команды');
        }
    }
}
exports.CommandRunnerViewProvider = CommandRunnerViewProvider;
CommandRunnerViewProvider.viewType = 'commandRunnerView';
//# sourceMappingURL=webviewProvider.js.map