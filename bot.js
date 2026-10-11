const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapearInstagram() {
    const username = 'nike'; // <-- Tu usuario sin el @
    const profileUrl = `https://www.instagram.com/${username}/`;
    
    console.log(`Abriendo navegador para: ${profileUrl}`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--lang=es-ES,es'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        const posts = await page.evaluate(() => {
            const items = [];
            const imgElements = document.querySelectorAll('main article img');
            
            imgElements.forEach((img, index) => {
                if (index < 6) { // Últimos 6 posts
                    items.push({
                        id: index + 1,
                        imagen: img.src || '',
                        descripcion: img.alt || 'Sin descripción'
                    });
                }
            });
            return items;
        });

        await browser.close();

        if (posts.length === 0) {
            console.log('No se pudieron extraer posts.');
            return;
        }

        console.log(`Se extrajeron ${posts.length} publicaciones con éxito.`);

        // Guardar los datos en posts.json (en la raíz del proyecto)
        const rutaJson = path.join(__dirname, '../posts.json');
        fs.writeFileSync(rutaJson, JSON.stringify(posts, null, 2));
        console.log('Archivo posts.json actualizado localmente.');

    } catch (error) {
        console.error('Error durante el scraping:', error);
        await browser.close();
        process.exit(1);
    }
}

scrapearInstagram();
