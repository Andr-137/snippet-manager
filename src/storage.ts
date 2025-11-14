// src/storage.ts
import * as fs from 'fs';
import * as path from 'path';
import vscode from './vscode';

export interface CommandItem {
    id: string;
    title: string;
    command: string;
}

// Добавляем в существующий файл
const SETTINGS_FILENAME = 'settings.json';

export interface AppSettings {
    language: string;
}

export function getSettingsPath(context: vscode.ExtensionContext): string {
    return path.join(context.globalStorageUri.fsPath, SETTINGS_FILENAME);
}

export function loadSettings(context: vscode.ExtensionContext): AppSettings {
    const filePath = getSettingsPath(context);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('⚠️ Не удалось загрузить настройки:', e);
    }
    return { language: 'ru' }; // Значение по умолчанию
}

export function saveSettings(context: vscode.ExtensionContext, settings: AppSettings): void {
    const filePath = getSettingsPath(context);
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (e) {
        console.error('Не удалось сохранить настройки:', e);
    }
}

const FILENAME = 'commands.json';

// Получаем путь к файлу в рабочей папке .vscode или глобально
export function getStoragePath(context: vscode.ExtensionContext): string {
    // Если есть открытая папка — сохраняем в неё, иначе — в глобальное хранилище расширения
    // const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // if (workspaceRoot) {
    //     return path.join(workspaceRoot, '.vscode', FILENAME);
    // }
    // return path.join(context.globalStorageUri.fsPath, FILENAME);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let storagePath: string;

    if (workspaceRoot) {
        storagePath = path.join(workspaceRoot, '.vscode', FILENAME);
        console.log('📁 Workspace storage path:', storagePath);
    } else {
        storagePath = path.join(context.globalStorageUri.fsPath, FILENAME);
        console.log('📁 Global storage path:', storagePath);
    }

    return storagePath;
}

// Загрузка команд
export function loadCommands(context: vscode.ExtensionContext): CommandItem[] {
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
    } catch (e) {
        console.error('⚠️ Не удалось загрузить команды:', e);
    }
    return [];
}

// Сохранение команд
export function saveCommands(context: vscode.ExtensionContext, commands: CommandItem[]): void {
    const filePath = getStoragePath(context);
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(commands, null, 2), 'utf8');
    } catch (e) {
        console.error('Не удалось сохранить команды:', e);
    }
}