const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');

if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Remove scripts mortos do rtmark.net
    html = html.replace(/<script[^>]*rtmark\.net[^>]*>.*?<\/script>/gis, '');
    
    // Adiciona loading="lazy" e decoding="async" em imagens que não possuem
    html = html.replace(/<img(?![^>]*loading=)([^>]*?)>/g, '<img loading="lazy" decoding="async"$1>');

    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('HTML otimizado com sucesso!');
} else {
    console.log('Arquivo index.html não encontrado na raiz.');
}