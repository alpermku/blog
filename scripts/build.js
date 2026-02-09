const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '../src/posts');
const TEMPLATE_DIR = path.join(__dirname, '../src/templates');
const OUTPUT_DIR = path.join(__dirname, '..');

// Helper: Read Template
function getTemplate(name) {
    return fs.readFileSync(path.join(TEMPLATE_DIR, name), 'utf8');
}

// Helper: Ensure dir
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 1. Load Posts
const posts = fs.readdirSync(POSTS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => {
        const data = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
        // Slug oluştur (dosya adından veya başlıktan)
        data.slug = file.replace('.json', '');
        return data;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

// 2. Generate Post Pages
const layout = getTemplate('layout.html');

posts.forEach(post => {
    let html = layout.replace('{{TITLE}}', post.title);
    
    // TTS Button logic
    const ttsBtnEn = `<button class="tts-btn" onclick="toggleSpeech(this, 'en-US')">▶️ Listen (EN)</button>`;
    const ttsBtnTr = `<button class="tts-btn" onclick="toggleSpeech(this, 'tr-TR')">▶️ Dinle (TR)</button>`;

    const content = `
        <article class="post full-post">
            <span class="date">${post.date}</span>
            <h2>${post.title}</h2>
            <div class="content-en">
                ${ttsBtnEn}
                ${post.content_en}
            </div>
            <hr class="lang-divider">
            <div class="content-tr">
                ${ttsBtnTr}
                ${post.content_tr}
            </div>
        </article>
    `;

    html = html.replace('{{CONTENT}}', content);
    html = html.replace('{{ACTIVE_JOURNAL}}', post.category === 'journal' ? 'active' : '');
    html = html.replace('{{ACTIVE_ARTICLES}}', post.category === 'article' ? 'active' : '');

    ensureDir(path.join(OUTPUT_DIR, 'posts'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'posts', `${post.slug}.html`), html);
});

// 3. Generate Lists (Pagination)
function generateList(category, outputFilename, title) {
    const filteredPosts = posts.filter(p => p.category === category);
    const PER_PAGE = 20;
    const totalPages = Math.ceil(filteredPosts.length / PER_PAGE);

    // Ana liste (Sayfa 1)
    let listHtml = filteredPosts.slice(0, PER_PAGE).map(post => `
        <article class="post preview">
            <span class="date">${post.date}</span>
            <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
            <div class="excerpt">
                ${post.content_en.split('</p>')[0]}</p>
            </div>
            <a href="posts/${post.slug}.html" class="read-more">Read More / Devamını Oku &rarr;</a>
        </article>
    `).join('');

    // Pagination HTML
    if (totalPages > 1) {
        listHtml += '<div class="pagination">';
        for (let i = 1; i <= totalPages; i++) {
            listHtml += `<a href="#">${i}</a>`; // Basit tuttum, geliştirilebilir
        }
        listHtml += '</div>';
    }

    let pageHtml = layout.replace('{{TITLE}}', title);
    pageHtml = pageHtml.replace('{{CONTENT}}', listHtml);
    // Active menu logic
    pageHtml = pageHtml.replace('{{ACTIVE_JOURNAL}}', category === 'journal' ? 'active' : '');
    pageHtml = pageHtml.replace('{{ACTIVE_ARTICLES}}', category === 'article' ? 'active' : '');

    fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), pageHtml);
}

generateList('journal', 'index.html', 'Journal');
generateList('article', 'articles.html', 'Articles');

console.log(`Built ${posts.length} posts successfully.`);