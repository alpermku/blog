const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../'); // workspace root
const OUT = path.join(__dirname, '../src/posts/rorschach-data.json');

const files = [];

function scan(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === '.git' || file === 'node_modules' || file === '.DS_Store') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scan(fullPath);
        } else {
            const ext = path.extname(file).toLowerCase();
            let type = 'other';
            if (ext === '.html') type = 'html';
            else if (ext === '.js') type = 'js';
            else if (ext === '.css') type = 'css';
            else if (ext === '.json') type = 'json';
            else if (ext === '.md') type = 'md';
            else if (ext === '.jpg' || ext === '.png' || ext === '.svg') type = 'image';

            files.push({
                name: file,
                size: stat.size,
                mtime: stat.mtimeMs,
                type: type
            });
        }
    });
}

scan(ROOT);

// Sort by size (largest first usually looks better in center) or time
files.sort((a, b) => b.size - a.size);

// Limit to top 200 to avoid clutter
const topFiles = files.slice(0, 200);

const output = {
    title: "Workspace Rorschach",
    date: new Date().toISOString().split('T')[0],
    data: topFiles
};

fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
console.log(`Scanned ${files.length} files. Saved top ${topFiles.length} to ${OUT}`);