const fs = require('fs');
const path = require('path');

// --- Configuration & Constants ---
const CONFIG = {
    dirs: {
        posts: path.join(__dirname, '../src/posts'),
        pages: path.join(__dirname, '../src/pages'),
        templates: path.join(__dirname, '../src/templates'),
        output: path.join(__dirname, '..'),
    },
    files: {
        rorschachData: path.join(__dirname, '../src/posts/rorschach-data.json'),
        rorschachTemplate: path.join(__dirname, '../src/templates/rorschach_template.html'),
        layout: 'layout.html',
    },
    nav: ['journal', 'article', 'radar', 'gallery', 'about'],
    perPage: 20
};

// --- Helpers ---
const getTemplate = (name) => fs.readFileSync(path.join(CONFIG.dirs.templates, name), 'utf8');
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

/**
 * Generates TTS buttons HTML
 */
const getTTSButtons = () => ({
    en: `<button class="tts-btn" onclick="toggleSpeech(this, 'en-US')"><span>▶️</span> Listen (EN)</button>`,
    tr: `<button class="tts-btn" onclick="toggleSpeech(this, 'tr-TR')"><span>▶️</span> Dinle (TR)</button>`
});

/**
 * Replaces navigation placeholders in layout
 * @param {string} html - The layout HTML
 * @param {string} activeCategory - The category to mark active
 */
const setActiveNav = (html, activeCategory) => {
    CONFIG.nav.forEach(cat => {
        const placeholder = `{{ACTIVE_${cat.toUpperCase()}}}`;
        const replacement = cat === activeCategory ? 'active' : '';
        html = html.replace(placeholder, replacement);
    });
    return html;
};

// --- 1. Load Data ---
const loadPosts = () => {
    return fs.readdirSync(CONFIG.dirs.posts)
        .filter(file => file.endsWith('.json') && !file.includes('rorschach'))
        .map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(CONFIG.dirs.posts, file), 'utf8'));
            data.slug = file.replace('.json', '');
            return data;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const posts = loadPosts();
const layout = getTemplate(CONFIG.files.layout);
const ttsButtons = getTTSButtons();

// --- 2. Build Functions ---

/**
 * Generates individual post pages
 */
const buildPosts = () => {
    ensureDir(path.join(CONFIG.dirs.output, 'posts'));
    
    posts.forEach(post => {
        let html = layout.replace(/{{ROOT}}/g, '..'); 
        html = html.replace('{{TITLE}}', post.title);
        
        const content = `
            <article class="post full-post">
                <span class="date">${post.date}</span>
                <h2>${post.title}</h2>
                <div class="content-en">
                    ${ttsButtons.en}
                    ${post.content_en}
                </div>
                <hr class="lang-divider">
                <div class="content-tr">
                    ${ttsButtons.tr}
                    ${post.content_tr}
                </div>
            </article>
        `;

        html = html.replace('{{CONTENT}}', content);
        html = setActiveNav(html, post.category);
        
        fs.writeFileSync(path.join(CONFIG.dirs.output, 'posts', `${post.slug}.html`), html);
    });
};

/**
 * Generates paginated lists (Journal, Articles, etc)
 */
const buildLists = (category, outputFilename, title) => {
    const filteredPosts = posts.filter(p => p.category === category);
    const totalPages = Math.ceil(filteredPosts.length / CONFIG.perPage);
    
    // Generate List Items
    let listHtml = filteredPosts.slice(0, CONFIG.perPage).map(post => `
        <article class="post preview">
            <span class="date">${post.date}</span>
            <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
            <div class="excerpt">
                ${post.content_en.split('</p>')[0]}</p>
            </div>
            <a href="posts/${post.slug}.html" class="read-more">Read More / Devamını Oku &rarr;</a>
        </article>
    `).join('');

    // Pagination
    if (totalPages > 1) {
        listHtml += '<div class="pagination">';
        for (let i = 1; i <= totalPages; i++) {
            listHtml += `<a href="#">${i}</a>`;
        }
        listHtml += '</div>';
    }

    let pageHtml = layout.replace(/{{ROOT}}/g, '.');
    pageHtml = pageHtml.replace('{{TITLE}}', title);
    pageHtml = pageHtml.replace('{{CONTENT}}', listHtml);
    pageHtml = setActiveNav(pageHtml, category);

    fs.writeFileSync(path.join(CONFIG.dirs.output, outputFilename), pageHtml);
};

/**
 * Generates static pages (About, etc)
 */
const buildStaticPages = () => {
    if (!fs.existsSync(CONFIG.dirs.pages)) return;

    fs.readdirSync(CONFIG.dirs.pages).forEach(file => {
        if (!file.endsWith('.json')) return;
        const pageData = JSON.parse(fs.readFileSync(path.join(CONFIG.dirs.pages, file), 'utf8'));
        
        let html = layout.replace(/{{ROOT}}/g, '.');
        html = html.replace('{{TITLE}}', pageData.title);
        
        const showTTS = pageData.slug !== 'gallery'; 
        const btnEn = showTTS ? ttsButtons.en : '';
        const btnTr = showTTS ? ttsButtons.tr : '';

        let content = '';
        if (pageData.content_en && pageData.content_tr) {
             content = `
                <article class="post full-post about-page">
                    <h2>${pageData.title}</h2>
                    <div class="content-en">
                        ${btnEn}
                        ${pageData.content_en}
                    </div>
                    <hr class="lang-divider">
                    <div class="content-tr">
                        ${btnTr}
                        ${pageData.content_tr}
                    </div>
                </article>
            `;
        } else {
            content = `<section class="about-content">${pageData.content}</section>`;
        }
        
        html = html.replace('{{CONTENT}}', content);
        html = setActiveNav(html, pageData.slug);

        fs.writeFileSync(path.join(CONFIG.dirs.output, `${pageData.slug}.html`), html);
    });
};

/**
 * Special build for Rorschach experiment
 */
const buildRorschach = () => {
    if (fs.existsSync(CONFIG.files.rorschachData) && fs.existsSync(CONFIG.files.rorschachTemplate)) {
        const rawData = fs.readFileSync(CONFIG.files.rorschachData, 'utf8');
        const template = fs.readFileSync(CONFIG.files.rorschachTemplate, 'utf8');
        const jsonData = JSON.parse(rawData);
        
        // Inject data into HTML
        const html = template.replace('const INJECTED_DATA = [];', `const INJECTED_DATA = ${JSON.stringify(jsonData.data)};`);
        
        fs.writeFileSync(path.join(CONFIG.dirs.output, 'rorschach.html'), html);
    }
};

// --- Execution ---
console.time('Build Time');
buildPosts();
buildLists('journal', 'index.html', 'Journal');
buildLists('article', 'articles.html', 'Articles');
buildLists('radar', 'radar.html', 'Tech Radar');
buildStaticPages();
buildRorschach();
console.timeEnd('Build Time');
console.log(`Built ${posts.length} posts and site pages.`);
