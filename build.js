const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

// Add base path configuration
const BASE_PATH = process.env.NODE_ENV === 'production' ? '/Static-Site' : '';

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

// Add this function near the top of the file
function processIndexHtml() {
    if (!fs.existsSync('src/index.html')) return;

    const template = fs.readFileSync('src/templates/base.html', 'utf8');
    const indexContent = fs.readFileSync('src/index.html', 'utf8');
    
    // Extract the main content from index.html
    const mainContentMatch = indexContent.match(/<main>([\s\S]*?)<\/main>/);
    const mainContent = mainContentMatch ? mainContentMatch[1] : '';
    
    // Replace content in template
    const finalHtml = template
        .replace('{{title}}', 'Welcome to My Site')
        .replace('{{content}}', mainContent)
        .replace(/{{basePath}}/g, BASE_PATH);
    
    fs.writeFileSync('docs/index.html', finalHtml);
}

// Build pages from markdown
function buildPage(filePath) {
    // Skip index.md if it exists since we're using direct index.html
    if (path.basename(filePath) === 'index.md') {
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { attributes, body } = frontMatter(fileContent);
    const html = marked(body);
    
    // Get the output path
    const relativePath = path.relative('src/content', filePath);
    const baseName = path.basename(relativePath, '.md');
    let outputPath;
    
    if (baseName === 'index') {
        outputPath = path.join('docs', 'index.html');
    } else {
        // Create a directory for each page and put an index.html inside
        outputPath = path.join('docs', baseName, 'index.html');
    }
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    // Get template
    const template = fs.readFileSync(`src/templates/${attributes.template}.html`, 'utf8');
    
    // Replace template variables
    const finalHtml = template
        .replace('{{title}}', attributes.title)
        .replace('{{content}}', html)
        .replace(/{{basePath}}/g, BASE_PATH);  // Replace all instances of basePath
    
    fs.writeFileSync(outputPath, finalHtml);
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

processIndexHtml();
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