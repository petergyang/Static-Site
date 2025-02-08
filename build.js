const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

// Ensure directories exist
const dirs = ['src/content', 'src/templates', 'src/styles', 'src/scripts', 'docs'];
dirs.forEach(dir => fs.ensureDirSync(dir));

// Create basic template if it doesn't exist
const baseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
        <a href="/about">About</a>
    </nav>
    <main>
        {{content}}
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Your Name</p>
    </footer>
</body>
</html>`;

if (!fs.existsSync('src/templates/base.html')) {
    fs.writeFileSync('src/templates/base.html', baseTemplate);
}

// Copy static assets
fs.copySync('src/styles', 'docs/styles', { overwrite: true });
if (fs.existsSync('src/scripts')) {
    fs.copySync('src/scripts', 'docs/scripts', { overwrite: true });
}

// Build pages from markdown
function buildPage(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { attributes, body } = frontMatter(content);
    const html = marked(body);
    
    const template = fs.readFileSync('src/templates/base.html', 'utf-8');
    const page = template
        .replace('{{title}}', attributes.title || 'My Site')
        .replace('{{content}}', html);
    
    // Generate output path
    const relativePath = path.relative('src/content', filepath);
    const outputPath = path.join('docs', relativePath.replace('.md', '.html'));
    
    // If file is index.md, put it in the root
    if (path.basename(filepath) === 'index.md') {
        fs.outputFileSync('docs/index.html', page);
    } else {
        // Create directory for the page and add index.html
        const dir = outputPath.replace('.html', '');
        fs.outputFileSync(path.join(dir, 'index.html'), page);
    }
}

// Process all markdown files
function buildSite() {
    const files = fs.readdirSync('src/content');
    files.forEach(file => {
        if (file.endsWith('.md')) {
            buildPage(path.join('src/content', file));
        }
    });
}

buildSite();

// Watch mode
if (process.argv.includes('--watch')) {
    console.log('Watching for changes...');
    fs.watch('src/content', (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
            console.log(`Rebuilding due to changes in ${filename}`);
            buildSite();
        }
    });
} 