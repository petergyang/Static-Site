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
    <link rel="stylesheet" href="{{basePath}}/styles/main.css">
</head>
<body>
    <nav>
        <a href="{{basePath}}/">Home</a>
        <a href="{{basePath}}/blog">Blog</a>
        <a href="{{basePath}}/about">About</a>
    </nav>
    <main>
        {{content}}
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Peter Yang</p>
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

// Add this function to handle partials
function loadPartial(partialName) {
    const partialPath = path.join('src/templates/partials', `${partialName}.html`);
    if (fs.existsSync(partialPath)) {
        return fs.readFileSync(partialPath, 'utf8');
    }
    return ''; // Return empty string if partial doesn't exist
}

// Add this function to replace all partials in a template
function replacePartials(template) {
    const partialRegex = /{{(\w+)}}/g;
    return template.replace(partialRegex, (match, partialName) => {
        if (partialName === 'content' || partialName === 'title' || partialName === 'basePath') {
            return match; // Skip these special variables
        }
        return loadPartial(partialName);
    });
}

// Update the buildPage function to include partial replacement
function buildPage(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { attributes, body } = frontMatter(fileContent);
    const html = marked(body);
    
    // Get the output path
    const relativePath = path.relative('src/content', filePath);
    const pathParts = relativePath.split(path.sep);
    const baseName = path.basename(relativePath, '.md');
    let outputPath;
    
    if (pathParts[0] === 'blog') {
        outputPath = path.join('docs', 'blog', baseName, 'index.html');
    } else if (baseName === 'index') {
        outputPath = path.join('docs', 'index.html');
    } else {
        outputPath = path.join('docs', baseName, 'index.html');
    }
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    // Get template and process partials
    let template = fs.readFileSync(`src/templates/${attributes.template || 'base'}.html`, 'utf8');
    template = replacePartials(template);
    
    // Replace template variables
    const finalHtml = template
        .replace('{{title}}', attributes.title)
        .replace('{{content}}', html)
        .replace(/{{basePath}}/g, BASE_PATH);
    
    fs.writeFileSync(outputPath, finalHtml);
}

// Update the processIndexHtml function to include partial replacement
function processIndexHtml() {
    if (!fs.existsSync('src/index.html')) return;

    let template = fs.readFileSync('src/templates/base.html', 'utf8');
    template = replacePartials(template);
    const indexContent = fs.readFileSync('src/index.html', 'utf8');
    
    const mainContentMatch = indexContent.match(/<main>([\s\S]*?)<\/main>/);
    const mainContent = mainContentMatch ? mainContentMatch[1] : '';
    
    const finalHtml = template
        .replace('{{title}}', 'Welcome to My Site')
        .replace('{{content}}', mainContent)
        .replace(/{{basePath}}/g, BASE_PATH);
    
    fs.writeFileSync('docs/index.html', finalHtml);
}

// Build pages from markdown
function buildSite() {
    // Process files in root content directory
    const files = fs.readdirSync('src/content');
    files.forEach(file => {
        if (file.endsWith('.md')) {
            buildPage(path.join('src/content', file));
        }
    });

    // Process blog posts
    const blogDir = path.join('src/content/blog');
    if (fs.existsSync(blogDir)) {
        const blogPosts = fs.readdirSync(blogDir);
        blogPosts.forEach(file => {
            if (file.endsWith('.md')) {
                buildPage(path.join(blogDir, file));
            }
        });
    }

    // Generate blog index
    buildBlogIndex();
}

// Add this new function to generate the blog index
function buildBlogIndex() {
    const blogDir = path.join('src/content/blog');
    if (!fs.existsSync(blogDir)) {
        fs.mkdirSync(blogDir, { recursive: true });
        return;
    }

    const posts = fs.readdirSync(blogDir)
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
            const { attributes } = frontMatter(content);
            return {
                title: attributes.title,
                date: attributes.date,
                url: `${BASE_PATH}/blog/${path.basename(file, '.md')}`
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const blogIndexContent = `---
title: Blog
template: base
---

# My Blog

Welcome to my blog! Here are my latest posts:

${posts.map(post => `- [${post.title}](${post.url})`).join('\n')}
`;

    fs.writeFileSync('src/content/blog.md', blogIndexContent);
}

processIndexHtml();
buildSite();

// Update the watch mode to include partials directory
if (process.argv.includes('--watch')) {
    console.log('Watching for changes...');
    
    // Watch content directory
    fs.watch('src/content', (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
            console.log(`Rebuilding due to changes in ${filename}`);
            buildSite();
        }
    });

    // Watch partials directory
    const partialsDir = 'src/templates/partials';
    if (fs.existsSync(partialsDir)) {
        fs.watch(partialsDir, (eventType, filename) => {
            if (filename && filename.endsWith('.html')) {
                console.log(`Rebuilding due to changes in partial: ${filename}`);
                buildSite();
            }
        });
    }
} 