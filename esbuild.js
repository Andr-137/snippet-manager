// esbuild.js
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
	const options = {
		entryPoints: ['src/extension.ts'],
		bundle: true,
		outfile: 'dist/extension.js',
		format: 'cjs',
		platform: 'node',
		target: 'node18',
		external: ['vscode'],
		minify: production,
		sourcemap: !production,
		// ⬇️ КРИТИЧЕСКИ ВАЖНО: отключите tree-shaking для side-effect кода
		treeShaking: false,
		// ⬇️ Убедитесь, что все импорты включаются
		mainFields: ['module', 'main'],
		logLevel: 'info',
	};

	if (watch) {
		const ctx = await esbuild.context(options);
		await ctx.watch();
		console.log('📦 Watching for changes...');
	} else {
		await esbuild.build(options);
		console.log('📦 Build completed.');
	}
}

main().catch((e) => {
	console.error('❌ Build failed:', e);
	process.exit(1);
});