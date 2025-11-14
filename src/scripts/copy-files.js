// scripts/copy-files.js
const fs = require('fs');
const path = require('path');

function copyFiles() {
    const srcDir = path.join(__dirname, '../src');
    const distDir = path.join(__dirname, '../dist');
    
    // Копируем i18n файлы
    const i18nSrc = path.join(srcDir, 'i18n');
    const i18nDist = path.join(distDir, 'i18n');
    
    if (fs.existsSync(i18nSrc)) {
        if (!fs.existsSync(i18nDist)) {
            fs.mkdirSync(i18nDist, { recursive: true });
        }
        
        const files = fs.readdirSync(i18nSrc);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const srcFile = path.join(i18nSrc, file);
                const distFile = path.join(i18nDist, file);
                fs.copyFileSync(srcFile, distFile);
                console.log(`Copied: ${srcFile} -> ${distFile}`);
            }
        });
    }
    
    console.log('✅ Файлы успешно скопированы');
}

copyFiles();