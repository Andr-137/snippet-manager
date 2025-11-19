"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.i18n = exports.I18n = void 0;
// src/i18n/index.ts
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Функция для загрузки переводов
function loadTranslation(lang) {
    const translationPath = path.join(__dirname, `${lang}.json`);
    try {
        if (fs.existsSync(translationPath)) {
            const rawData = fs.readFileSync(translationPath, 'utf8');
            return JSON.parse(rawData);
        }
    }
    catch (error) {
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
class I18n {
    constructor() {
        // Получаем язык из конфигурации или используем русский по умолчанию
        const config = vscode.workspace.getConfiguration('snippetManager');
        this.currentLanguage = config.get('language') || 'ru';
    }
    getTranslation() {
        return loadTranslation(this.currentLanguage);
    }
    getAvailableLanguages() {
        return ['ru', 'en'];
    }
    async setLanguage(language) {
        if (this.getAvailableLanguages().includes(language)) {
            this.currentLanguage = language;
            // Сохраняем в настройках VS Code
            await vscode.workspace.getConfiguration('snippetManager').update('language', language, vscode.ConfigurationTarget.Global);
        }
    }
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    // Метод для интерполяции строк (замена {title} на реальное значение)
    format(template, params) {
        return template.replace(/{(\w+)}/g, (_, key) => params[key] || '');
    }
}
exports.I18n = I18n;
exports.i18n = new I18n();
//# sourceMappingURL=index.js.map