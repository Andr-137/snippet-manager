// src/i18n/index.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface Translation {
    header: {
        add: string;
        language: string;
    };
    commands: {
        edit: string;
        delete: string;
        run: string;
        menu: string;
        top: string;
        down: string;
    };
    form: {
        title: string;
        command: string;
        save: string;
        cancel: string;
        addNew: string;
        edit: string;
    };
    messages: {
        noCommands: string;
        deleteConfirm: string;
        saved: string;
        deleted: string;
        emptyCommand: string;        
        error: string;               
        commandInserted: string;     
        commandExecuted: string;     
    };
    settings: {                      
        focusTerminal: string;
        executeCommand: string;
        clearBeforeRun: string;
    };
}

// Функция для загрузки переводов
function loadTranslation(lang: string): Translation {
    const translationPath = path.join(__dirname, `${lang}.json`);
    try {
        if (fs.existsSync(translationPath)) {
            const rawData = fs.readFileSync(translationPath, 'utf8');
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error(`Error loading translation for ${lang}:`, error);
    }

    // Возвращаем перевод по умолчанию если файл не найден
    return {
        header: {
            add: lang === 'en' ? 'Add' : 'Добавить',
            language: lang === 'en' ? 'Language' : 'Язык'
        },
        commands: {
            edit: lang === 'en' ? 'Edit' : 'Изменить',
            delete: lang === 'en' ? 'Delete' : 'Удалить',
            run: lang === 'en' ? 'Run' : 'Запустить',
            menu: lang === 'en' ? "Menu" : "Меню",
            top: lang === 'en' ? 'Top' : 'Вверх',
            down: lang === 'en' ? 'Down' : 'Вниз'
        },
        form: {
            title: lang === 'en' ? 'Command title' : 'Название команды',
            command: lang === 'en' ? 'Command (e.g., npm run dev)' : 'Команда (например, npm run dev)',
            save: lang === 'en' ? 'Save command' : 'Сохранить команду',
            cancel: lang === 'en' ? 'Cancel' : 'Отмена',
            addNew: lang === 'en' ? 'Add new command' : 'Добавить новую команду',
            edit: lang === 'en' ? 'Edit command' : 'Редактировать команду'
        },
        messages: {
            noCommands: lang === 'en' ? 'No saved commands' : 'Нет сохраненных команд',
            deleteConfirm: lang === 'en' ? 'Are you sure you want to delete command "{title}"?' : 'Вы уверены, что хотите удалить команду "{title}"?',
            saved: lang === 'en' ? 'Command saved' : 'Команда сохранена',
            deleted: lang === 'en' ? 'Command deleted' : 'Команда удалена',
            emptyCommand: lang === 'en' ? 'Command is empty' : 'Команда пустая',
            error: lang === 'en' ? 'Error' : 'Ошибка',
            commandInserted: lang === 'en' ? 'Command inserted into terminal' : 'Команда вставлена в терминал',
            commandExecuted: lang === 'en' ? 'Command executed in terminal' : 'Команда выполнена в терминале'
        },
        settings: {
            focusTerminal: lang === 'en' ? 'Focus terminal' : 'Фокусировать терминал',
            executeCommand: lang === 'en' ? 'Execute command immediately' : 'Выполнять команду сразу',
            clearBeforeRun: lang === 'en' ? 'Clear before run' : 'Очищать перед запуском'
        }
    };
}

export class I18n {
    private currentLanguage: string;

    constructor() {
        // Получаем язык из конфигурации или используем русский по умолчанию
        const config = vscode.workspace.getConfiguration('snippetManager');
        this.currentLanguage = config.get('language') || 'ru';
    }

    public getTranslation(): Translation {
        return loadTranslation(this.currentLanguage);
    }

    public getAvailableLanguages(): string[] {
        return ['ru', 'en'];
    }

    public async setLanguage(language: string): Promise<void> {
        if (this.getAvailableLanguages().includes(language)) {
            this.currentLanguage = language;
            // Сохраняем в настройках VS Code
            await vscode.workspace.getConfiguration('snippetManager').update('language', language, vscode.ConfigurationTarget.Global);
        }
    }

    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    // Метод для интерполяции строк (замена {title} на реальное значение)
    public format(template: string, params: Record<string, string>): string {
        return template.replace(/{(\w+)}/g, (_, key) => params[key] || '');
    }
}

export const i18n = new I18n();