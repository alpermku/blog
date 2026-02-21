const fs = require('fs');
const path = require('path');

/**
 * 🌙 Night Hunter: Refactored Build Script
 * Optimized for readability, modularity, and error handling.
 */

// --- Configuration ---
const CONFIG = {
    dirs: {
        root: path.resolve(__dirname, '..'),
        src: path.resolve(__dirname, '../src'),
        posts: path.resolve(__dirname, '../src/posts'),
        pages: path.resolve(__dirname, '../src/pages'),
        templates: path.resolve(__dirname, '../src/templates'),
        output: path.resolve(__dirname, '..'), // Output to repo root
    },
    files: {
        layout: 'layout.html',
        rorschachData: 'rorschach-data.json',
        rorschachTemplate: 'rorschach_template.html',
    },
    nav: ['journal', 'article', 'radar', 'gallery', 'games', 'about'],
    perPage: 20
};

// --- Helpers ---
const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readFile(filePath));
const writeFile = (filePath, content) => fs.writeFileSync(filePath, content);
const exists = (filePath) => fs.existsSync(filePath);

const getTemplate = (name) => readFile(path.join(CONFIG.dirs.templates, name));

const ensureDir = (dirPath) => {
    if (!exists(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Standardized Layout Renderer
 * Replaces common placeholders in the layout template.
 */
const renderLayout = (template, { title, content, activeNav, rootPath = '.' }) => {
    let html = template
        .replace(/{{ROOT}}/g, rootPath)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{CONTENT}}/g, content);

    // Handle Active Navigation State
    CONFIG.nav.forEach(cat => {
        const placeholder = `{{ACTIVE_${cat.toUpperCase()}}}`;
        const replacement = cat === activeNav ? 'active' : '';
        html = html.replace(placeholder, replacement);
    });

    return html;
};

// --- Content Generators ---

const getTTSButtons = () => ({
    en: `<button class="tts-btn" onclick="toggleSpeech(this, 'en-US')"><span>▶️</span> Listen (EN)</button>`,
    tr: `<button class="tts-btn" onclick="toggleSpeech(this, 'tr-TR')"><span>▶️</span> Dinle (TR)</button>`
});

const ttsButtons = getTTSButtons();

/**
 * Loads and parses all post JSON files.
 */
const loadPosts = () => {
    try {
        return fs.readdirSync(CONFIG.dirs.posts)
            .filter(file => file.endsWith('.json') && !file.includes('rorschach'))
            .map(file => {
                const data = readJson(path.join(CONFIG.dirs.posts, file));
                return { ...data, slug: file.replace('.json', '') };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.warn('⚠️ No posts found or error reading posts:', error.message);
        return [];
    }
};

// --- Build Tasks ---

const buildPosts = (posts, layout) => {
    const outputDir = path.join(CONFIG.dirs.output, 'posts');
    ensureDir(outputDir);

    posts.forEach(post => {
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

        const html = renderLayout(layout, {
            title: post.title,
            content: content,
            activeNav: post.category,
            rootPath: '..'
        });

        writeFile(path.join(outputDir, `${post.slug}.html`), html);
    });
};

const buildLists = (posts, layout, category, outputFilename, title) => {
    const filteredPosts = posts.filter(p => p.category === category);
    
    // Generate List Items
    let listHtml = filteredPosts.slice(0, CONFIG.perPage).map(post => {
        // Safe excerpt generation
        const excerpt = post.content_en ? post.content_en.split('</p>')[0] + '</p>' : '';
        return `
            <article class="post preview">
                <span class="date">${post.date}</span>
                <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
                <div class="excerpt">${excerpt}</div>
                <a href="posts/${post.slug}.html" class="read-more">Read More / Devamını Oku &rarr;</a>
            </article>
        `;
    }).join('');

    // Pagination (Placeholder for now)
    const totalPages = Math.ceil(filteredPosts.length / CONFIG.perPage);
    if (totalPages > 1) {
        listHtml += `<div class="pagination"><!-- Pagination logic needed for static pages --></div>`;
    }

    const html = renderLayout(layout, {
        title: title,
        content: listHtml || '<p>No posts found.</p>',
        activeNav: category,
        rootPath: '.'
    });

    writeFile(path.join(CONFIG.dirs.output, outputFilename), html);
};

const buildStaticPages = (layout) => {
    if (!exists(CONFIG.dirs.pages)) return;

    fs.readdirSync(CONFIG.dirs.pages).forEach(file => {
        if (!file.endsWith('.json')) return;
        
        const pageData = readJson(path.join(CONFIG.dirs.pages, file));
        const showTTS = pageData.slug !== 'gallery';
        
        let content;
        if (pageData.content_en && pageData.content_tr) {
             content = `
                <article class="post full-post about-page">
                    <h2>${pageData.title}</h2>
                    <div class="content-en">
                        ${showTTS ? ttsButtons.en : ''}
                        ${pageData.content_en}
                    </div>
                    <hr class="lang-divider">
                    <div class="content-tr">
                        ${showTTS ? ttsButtons.tr : ''}
                        ${pageData.content_tr}
                    </div>
                </article>
            `;
        } else {
            content = `<section class="about-content">${pageData.content || ''}</section>`;
        }

        const html = renderLayout(layout, {
            title: pageData.title,
            content: content,
            activeNav: pageData.slug,
            rootPath: '.'
        });

        writeFile(path.join(CONFIG.dirs.output, `${pageData.slug}.html`), html);
    });
};

const buildRorschach = () => {
    const dataPath = path.join(CONFIG.dirs.posts, CONFIG.files.rorschachData);
    const tplPath = path.join(CONFIG.dirs.templates, CONFIG.files.rorschachTemplate);

    if (exists(dataPath) && exists(tplPath)) {
        const jsonData = readJson(dataPath);
        const template = readFile(tplPath);
        
        // Inject data into HTML
        const html = template.replace(
            'const INJECTED_DATA = [];', 
            `const INJECTED_DATA = ${JSON.stringify(jsonData.data)};`
        );
        
        writeFile(path.join(CONFIG.dirs.output, 'rorschach.html'), html);
    }
};

/**
 * Auto-sync games.json with games/ directory.
 * Scans games/*.html, extracts title, and ensures games.json lists all games.
 * This prevents games from "disappearing" when games.json is manually edited.
 */
const GAME_REGISTRY = {
    // slug -> { icon, name_en, name_tr, desc_en, desc_tr }
    'asteroids':   { icon: '☄️', name_en: 'Neon Rocks',        name_tr: 'Neon Rocks',        desc_en: 'Classic asteroids. Destroy, collect, survive.',              desc_tr: 'Klasik asteroit. Parçala, topla, hayatta kal.' },
    'catalyst':    { icon: '💥', name_en: 'Catalyst',          name_tr: 'Catalyst',          desc_en: 'One click. Chain reaction. Detonate them all.',             desc_tr: 'Tek tık. Zincirleme reaksiyon. Hepsini patlat.' },
    'drift':       { icon: '🏎️', name_en: 'Drift',             name_tr: 'Drift',             desc_en: 'Graze past danger. The closer, the higher you score.', desc_tr: 'Tehlikeye yakın geç. Ne kadar yakın, o kadar çok puan.' },
    'chronobreak': { icon: '⏱️', name_en: 'Chrono Break',      name_tr: 'Chrono Break',      desc_en: 'Time moves only when you move. Neon survival shooter.',     desc_tr: 'Zaman sadece sen hareket edince akar. Neon hayatta kalma oyunu.' },
    'fracture':    { icon: '💎', name_en: 'Fracture',           name_tr: 'Fracture',          desc_en: 'Neon breakout. Smash bricks, don\'t lose the ball.',        desc_tr: 'Neon breakout. Tuğlaları kır, topu kaçırma.' },
    'gravityflip': { icon: '🌀', name_en: 'Gravity Flip',      name_tr: 'Gravity Flip',      desc_en: 'Flip gravity to dodge walls. Endless runner.',              desc_tr: 'Yerçekimini tersine çevir, engellerden kaç.' },
    'hexchain':    { icon: '⬡',  name_en: 'Hexchain',           name_tr: 'Hexchain',          desc_en: 'Chain hex tiles in sequence. Pattern puzzle.',              desc_tr: 'Altıgen taşları sırayla bağla. Örüntü bulmacası.' },
    'orbital':     { icon: '🛰️', name_en: 'Orbital Defense',   name_tr: 'Yörünge Savunması', desc_en: 'Protect the core. 360° shield defense system.',             desc_tr: 'Çekirdeği koru. 360° kalkan savunma sistemi.' },
    'pulsewave':   { icon: '🎵', name_en: 'Pulsewave',          name_tr: 'Pulsewave',         desc_en: 'Ride the rhythm. Tap to the beat, survive the pulse.',      desc_tr: 'Ritme bin. Vuruşa bas, dalgada kal.' },
    'voidsnake':   { icon: '🐍', name_en: 'Void Snake',         name_tr: 'Void Snake',        desc_en: 'Collect stars in the void. Speed keeps rising.',            desc_tr: 'Boşlukta yıldız topla. Hız sürekli artıyor.' },
};

const syncGamesPage = () => {
    const gamesDir = path.join(CONFIG.dirs.output, 'games');
    const gamesJsonPath = path.join(CONFIG.dirs.pages, 'games.json');
    
    if (!exists(gamesDir)) return;

    // Discover all game HTML files
    const gameFiles = fs.readdirSync(gamesDir)
        .filter(f => f.endsWith('.html'))
        .map(f => f.replace('.html', ''))
        .sort();

    if (gameFiles.length === 0) return;

    // For unknown games, try to extract title from HTML
    gameFiles.forEach(slug => {
        if (!GAME_REGISTRY[slug]) {
            try {
                const html = readFile(path.join(gamesDir, `${slug}.html`));
                const titleMatch = html.match(/<title>(.+?)\s*[-–]\s*Arcade<\/title>/i);
                const name = titleMatch ? titleMatch[1].trim() : slug;
                GAME_REGISTRY[slug] = {
                    icon: '🎮', name_en: name, name_tr: name,
                    desc_en: `Play ${name}.`, desc_tr: `${name} oyna.`
                };
            } catch (e) {
                GAME_REGISTRY[slug] = {
                    icon: '🎮', name_en: slug, name_tr: slug,
                    desc_en: `Play ${slug}.`, desc_tr: `${slug} oyna.`
                };
            }
        }
    });

    // Build gallery HTML
    const makeGrid = (lang) => {
        const cards = gameFiles.map(slug => {
            const g = GAME_REGISTRY[slug];
            const name = lang === 'tr' ? g.name_tr : g.name_en;
            const desc = lang === 'tr' ? g.desc_tr : g.desc_en;
            return `<a href='games/${slug}.html' class='gallery-card'><div class='card-icon'>${g.icon}</div><h3>${name}</h3><p>${desc}</p></a>`;
        }).join('');
        return `<div class='gallery-grid'>${cards}</div>`;
    };

    const gamesJson = {
        title: 'Arcade',
        slug: 'games',
        content: makeGrid('en'),
        content_en: makeGrid('en'),
        content_tr: makeGrid('tr')
    };

    writeFile(gamesJsonPath, JSON.stringify(gamesJson, null, 4));
    console.log(`🎮 Games synced: ${gameFiles.length} games found.`);
};

// --- Main Execution ---
const run = () => {
    console.time('🌙 Night Hunter Build');
    
    try {
        const layout = getTemplate(CONFIG.files.layout);
        const posts = loadPosts();

        buildPosts(posts, layout);
        buildLists(posts, layout, 'journal', 'index.html', 'Journal');
        buildLists(posts, layout, 'article', 'articles.html', 'Articles');
        buildLists(posts, layout, 'radar', 'radar.html', 'Tech Radar');
        syncGamesPage();
        buildStaticPages(layout);
        buildRorschach();

        console.log(`✅ Build complete: ${posts.length} posts processed.`);
    } catch (e) {
        console.error('❌ Build failed:', e);
        process.exit(1);
    }
    
    console.timeEnd('🌙 Night Hunter Build');
};

run();
