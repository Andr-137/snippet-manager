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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettingsPath = getSettingsPath;
exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.getStoragePath = getStoragePath;
exports.loadCommands = loadCommands;
exports.saveCommands = saveCommands;
// src/storage.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode_1 = __importDefault(require("./vscode"));
// Добавляем в существующий файл
const SETTINGS_FILENAME = 'settings.json';
function getSettingsPath(context) {
    return path.join(context.globalStorageUri.fsPath, SETTINGS_FILENAME);
}
function loadSettings(context) {
    const filePath = getSettingsPath(context);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (e) {
        console.error('⚠️ Не удалось загрузить настройки:', e);
    }
    return { language: 'ru' }; // Значение по умолчанию
}
function saveSettings(context, settings) {
    const filePath = getSettingsPath(context);
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
    }
    catch (e) {
        console.error('Не удалось сохранить настройки:', e);
    }
}
const FILENAME = 'commands.json';
// Получаем путь к файлу в рабочей папке .vscode или глобально
function getStoragePath(context) {
    // Если есть открытая папка — сохраняем в неё, иначе — в глобальное хранилище расширения
    // const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // if (workspaceRoot) {
    //     return path.join(workspaceRoot, '.vscode', FILENAME);
    // }
    // return path.join(context.globalStorageUri.fsPath, FILENAME);
    const workspaceRoot = vscode_1.default.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let storagePath;
    if (workspaceRoot) {
        storagePath = path.join(workspaceRoot, '.vscode', FILENAME);
        console.log('📁 Workspace storage path:', storagePath);
    }
    else {
        storagePath = path.join(context.globalStorageUri.fsPath, FILENAME);
        console.log('📁 Global storage path:', storagePath);
    }
    return storagePath;
}
// Загрузка команд
function loadCommands(context) {
    const filePath = getStoragePath(context);
    console.log('📁 Загрузка команд из:', filePath);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            console.log('📄 Содержимое файла:', data);
            const parsed = JSON.parse(data);
            console.log('🔍 Парсинг результата:', parsed);
            // Проверяем структуру данных
            if (Array.isArray(parsed)) {
                // Убедимся, что у всех элементов есть ID
                const validatedCommands = parsed.map((cmd, index) => {
                    if (!cmd.id) {
                        console.warn(`⚠️ У команды ${index} нет ID, создаем новый`);
                        return { ...cmd, id: Date.now().toString() + index };
                    }
                    return { ...cmd, id: String(cmd.id) }; // Гарантируем, что ID строка
                });
                return validatedCommands;
            }
        }
    }
    catch (e) {
        console.error('⚠️ Не удалось загрузить команды:', e);
    }
    return [];
}
// Сохранение команд
function saveCommands(context, commands) {
    const filePath = getStoragePath(context);
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(commands, null, 2), 'utf8');
    }
    catch (e) {
        console.error('Не удалось сохранить команды:', e);
    }
}
//# sourceMappingURL=storage.js.map