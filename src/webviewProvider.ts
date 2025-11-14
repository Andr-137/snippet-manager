// src/webviewProvider.ts
import * as fs from 'fs';
import * as path from 'path';
import vscode from './vscode';
import { CommandItem, loadCommands, saveCommands } from './storage';
import { i18n } from './i18n';


export class CommandRunnerViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'commandRunnerView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _context: vscode.ExtensionContext) {
        console.log('✅ CommandRunnerViewProvider создан');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
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
                    }
                } catch (error) {
                    console.error('❌ Ошибка обработки сообщения:', error);
                }
            });

            // Первоначальная загрузка команд
            this._refresh();

        } catch (error) {
            console.error('❌ Ошибка в resolveWebviewView:', error);
            webviewView.webview.html = this._getErrorHtml(error);
        }
    }

    private async _changeLanguage(language: string) {
        await i18n.setLanguage(language);
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            await this._refresh();
        }
    }

    private async _refresh() {
        if (!this._view) { return; }

        try {
            const commands = loadCommands(this._context);
            const translation = i18n.getTranslation();

            this._view.webview.postMessage({
                type: 'refreshCommands',
                commands: commands,
                translation: translation
            });
        } catch (error) {
            console.error('❌ Ошибка в _refresh:', error);
        }
    }

    private async _saveCommand(item: CommandItem) {
        try {
            const commands = loadCommands(this._context);

            if (item.id && item.id !== '') {
                const existingIndex = commands.findIndex(c => String(c.id) === String(item.id));
                if (existingIndex >= 0) {
                    commands[existingIndex] = item;
                } else {
                    item.id = Date.now().toString();
                    commands.push(item);
                }
            } else {
                item.id = Date.now().toString();
                commands.push(item);
            }

            saveCommands(this._context, commands);
            await this._refresh();

            vscode.window.showInformationMessage(i18n.getTranslation().messages.saved);

        } catch (error) {
            console.error('❌ Ошибка при сохранении:', error);
            vscode.window.showErrorMessage('Ошибка при сохранении команды');
        }
    }

    private async _deleteCommand(id: string, title: string) {
        try {
            console.log('🗑️ Удаление команды с ID:', id, 'Название:', title);

            const commands = loadCommands(this._context);
            console.log('📝 Команд до удаления:', commands.length);

            const filteredCommands = commands.filter(c => {
                const shouldKeep = String(c.id) !== String(id);
                console.log(`🔍 Сравниваем: "${c.id}" с "${id}" -> ${shouldKeep ? 'сохраняем' : 'УДАЛЯЕМ'}`);
                return shouldKeep;
            });

            console.log('📝 Команд после удаления:', filteredCommands.length);

            if (filteredCommands.length === commands.length) {
                console.log('❌ Команда не найдена для удаления!');
                vscode.window.showWarningMessage('Команда для удаления не найдена');
                return;
            }

            saveCommands(this._context, filteredCommands);
            await this._refresh();

            console.log('✅ Команда успешно удалена');
            vscode.window.showInformationMessage(i18n.getTranslation().messages.deleted);

        } catch (error) {
            console.error('❌ Ошибка при удалении:', error);
            vscode.window.showErrorMessage('Ошибка при удалении команды');
        }
    }

    private async _runCommandInTerminal(commandText: string) {
        try {
            if (!commandText || commandText.trim() === '') {
                vscode.window.showWarningMessage('Команда пустая');
                return;
            }

            let terminal = vscode.window.terminals.find(t => t.name === 'Command Runner');
            if (!terminal) {
                terminal = vscode.window.createTerminal('Command Runner');
            }

            terminal.show(true);
            terminal.sendText(commandText, false);

        } catch (error) {
            console.error('❌ Ошибка при запуске команды:', error);
            vscode.window.showErrorMessage(`Ошибка: ${error}`);
        }
    }


    private _getHtmlForWebview(webview: vscode.Webview): string {
        const t = i18n.getTranslation();
        const currentLanguage = i18n.getCurrentLanguage();

        const html = `
        <!DOCTYPE html>
        <html lang="${currentLanguage}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Command Runner</title>
            <style>
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
                    padding: 5px;
                }
                .command-item {
                    border: 1px solid var(--vscode-panel-border);
                    padding-top: 6px;
                    padding-left: 10px;
                    padding-right: 5px;
                    padding-bottom: 6px;
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
                    border: 1px solid var(--vscode-button-background);
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
                .menu-item {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                    padding: 5px;
                    z-index: 10;
                    display: none;
                }
                .menu-item-block {
                    display: flex;
                    gap: 5px;
                }
                .dots {
                    width: 18px;
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
                }
                .action-button.edit {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .action-button.delete {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }
                
                /* Стили для модальных окон */
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
                    padding: 5px;
                    width: 98%;
                    max-width: 500px;
                    margin-top: 20px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group input {
                    width: 95%;
                    padding: 8px;
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

            <!-- Модальное окно для добавления/редактирования -->
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

            <!-- Модальное окно для подтверждения удаления -->
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
                        return;
                    }
                    
                    currentCommands = commands;
                    commandItems = [];
                    
                    commands.forEach((cmd, index) => {
                        const item = document.createElement('div');
                        item.className = 'command-item';
                        item.setAttribute('data-index', index);
                        
                        // Экранируем специальные символы для безопасной вставки в HTML
                        const safeTitle = cmd.title.replace(/'/g, "\\\\'").replace(/"/g, "&quot;");
                        const safeCommand = cmd.command.replace(/'/g, "\\\\'").replace(/"/g, "&quot;");
                        
                        item.innerHTML = \`
                            <div class="command-title">\${cmd.title}</div>
                            <div class="command-actions">
                                <button class="dots" onclick="toggleMenu(this, event)">
                                    <svg width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                                        <path d="M116,64a12,12,0,1,1,12,12A12.01375,12.01375,0,0,1,116,64Zm12,52a12,12,0,1,0,12,12A12.01375,12.01375,0,0,0,128,116Zm0,64a12,12,0,1,0,12,12A12.01375,12.01375,0,0,0,128,180Z"/>
                                    </svg>
                                </button>
                                <div class="menu-item">
                                    <div class="menu-item-block">
                                        <button class="action-button edit" onclick="openEditModal('\${cmd.id}', '\${safeTitle}', '\${safeCommand}')" title="${t.commands.edit}">
                                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M15.2 6l-1.1-0.2c-0.1-0.2-0.1-0.4-0.2-0.6l0.6-0.9 0.5-0.7-2.6-2.6-0.7 0.5-0.9 0.6c-0.2-0.1-0.4-0.1-0.6-0.2l-0.2-1.1-0.2-0.8h-3.6l-0.2 0.8-0.2 1.1c-0.2 0.1-0.4 0.1-0.6 0.2l-0.9-0.6-0.7-0.4-2.5 2.5 0.5 0.7 0.6 0.9c-0.2 0.2-0.2 0.4-0.3 0.6l-1.1 0.2-0.8 0.2v3.6l0.8 0.2 1.1 0.2c0.1 0.2 0.1 0.4 0.2 0.6l-0.6 0.9-0.5 0.7 2.6 2.6 0.7-0.5 0.9-0.6c0.2 0.1 0.4 0.1 0.6 0.2l0.2 1.1 0.2 0.8h3.6l0.2-0.8 0.2-1.1c0.2-0.1 0.4-0.1 0.6-0.2l0.9 0.6 0.7 0.5 2.6-2.6-0.5-0.7-0.6-0.9c0.1-0.2 0.2-0.4 0.2-0.6l1.1-0.2 0.8-0.2v-3.6l-0.8-0.2zM15 9l-1.7 0.3c-0.1 0.5-0.3 1-0.6 1.5l0.9 1.4-1.4 1.4-1.4-0.9c-0.5 0.3-1 0.5-1.5 0.6l-0.3 1.7h-2l-0.3-1.7c-0.5-0.1-1-0.3-1.5-0.6l-1.4 0.9-1.4-1.4 0.9-1.4c-0.3-0.5-0.5-1-0.6-1.5l-1.7-0.3v-2l1.7-0.3c0.1-0.5 0.3-1 0.6-1.5l-1-1.4 1.4-1.4 1.4 0.9c0.5-0.3 1-0.5 1.5-0.6l0.4-1.7h2l0.3 1.7c0.5 0.1 1 0.3 1.5 0.6l1.4-0.9 1.4 1.4-0.9 1.4c0.3 0.5 0.5 1 0.6 1.5l1.7 0.3v2z"></path>
                                                <path d="M8 4.5c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5c0-1.9-1.6-3.5-3.5-3.5zM8 10.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5c0 1.4-1.1 2.5-2.5 2.5z"></path>
                                            </svg>
                                        </button>
                                        <button class="action-button delete" onclick="showDeleteConfirm('\${cmd.id}', '\${safeTitle}')" title="${t.commands.delete}">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        \`;
                        
                        list.appendChild(item);
                        commandItems.push(item);
                        
                        // ОДИН обработчик клика на всю команду
                        item.addEventListener('click', function(e) {
                            // Если клик был на элементах меню - игнорируем
                            if (e.target.closest('.command-actions')) {
                                return;
                            }
                            
                            // Если клик был на заголовке команды - запускаем команду
                            console.log('Запуск команды:', cmd.command);
                            runCommand(cmd.command);
                        });
                    });
                    
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
                        event.stopPropagation(); // Останавливаем всплытие сразу
                        event.preventDefault(); // Предотвращаем стандартное поведение
                    }
                    
                    const menu = button.nextElementSibling;
                    const isVisible = menu.style.display === 'block';
                    
                    // Скрываем все меню
                    document.querySelectorAll('.menu-item').forEach(m => {
                        m.style.display = 'none';
                    });
                    
                    // Показываем/скрываем текущее меню
                    menu.style.display = isVisible ? 'none' : 'block';
                }

                // Скрываем меню при клике вне его
                document.addEventListener('click', function() {
                    document.querySelectorAll('.menu-item').forEach(menu => {
                        menu.style.display = 'none';
                    });
                });

                function openAddModal() {
                    editingId = '';
                    document.getElementById('modalTitleInput').value = '';
                    document.getElementById('modalCommandInput').value = '';
                    document.getElementById('modalOverlay').classList.remove('hidden');
                }

                function openEditModal(id, title, command) {
                    editingId = id;
                    document.getElementById('modalTitleInput').value = title;
                    document.getElementById('modalCommandInput').value = command;
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

                function showDeleteConfirm(id, title) {
                    pendingDeleteId = id;
                    pendingDeleteTitle = title;
                    
                    const message = currentTranslation.messages.deleteConfirm.replace('{title}', title);
                    document.getElementById('deleteConfirmMessage').textContent = message;
                    document.getElementById('deleteConfirmOverlay').classList.remove('hidden');
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

                let lastCommandTime = 0;
                const COMMAND_COOLDOWN = 500; // 500ms cooldown

                function runCommand(cmd) {
                    const now = Date.now();
                    
                    // Защита от множественных быстрых вызовов
                    if (now - lastCommandTime < COMMAND_COOLDOWN) {
                        console.log('Команда проигнорирована - слишком быстро');
                        return;
                    }
                    
                    lastCommandTime = now;
                    
                    console.log('Запуск команды в терминал:', cmd);
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
                            if (activeIndex >= 0 && activeIndex < currentCommands.length) {
                                const cmd = currentCommands[activeIndex];
                                if (cmd) {
                                    console.log('Запуск команды по Enter:', cmd.command);
                                    runCommand(cmd.command);
                                }
                            }
                            break;

                        case 'Escape':
                            e.preventDefault();
                            // Скрываем все меню при Escape
                            document.querySelectorAll('.menu-item').forEach(menu => {
                                menu.style.display = 'none';
                            });
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
                    }
                });
            </script>
        </body>
        </html>
        `;
        return html;
    }

    private _getErrorHtml(error: any): string {
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
            <p>${error.toString()}</p>
            <button onclick="location.reload()">Перезагрузить</button>
        </body>
        </html>`;
    }
}