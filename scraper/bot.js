const puppeteer = require('puppeteer');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

async function scrapearInstagramRealista() {
    const username = 'nike'; // Reemplaza con tu usuario
    const profileUrl = `https://www.instagram.com/${username}/`;
    
    console.log(`Abriendo navegador en modo sigiloso para: ${profileUrl}`);
    
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
        
        // 1. Simular un Viewport de escritorio real
        await page.setViewport({ width: 1920, height: 1080 });

        // 2. Simular un User-Agent legítimo de Chrome en Windows
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // 3. Inyectar cabeceras adicionales para evitar detección básica de automatización
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        });

        // Ir al perfil público
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Esperar un momento aleatorio para simular comportamiento humano de carga
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extraer los posts del DOM
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
            console.log('No se pudieron extraer posts. Es posible que Instagram requiera autenticación o haya bloqueado la IP.');
            return;
        }

        console.log(`Se extrajeron ${posts.length} publicaciones con éxito.`);

        // 4. Guardar los datos localmente
        const rutaJson = path.join(__dirname, '../posts.json');
        fs.writeFileSync(rutaJson, JSON.stringify(posts, null, 2));

        // 5. Automatizar Git Push
        const git = simpleGit();
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO;

        if (!token || !repo) {
            console.log('Faltan GITHUB_TOKEN o GITHUB_REPO. Omitiendo git push.');
            return;
        }

        const remoteUrl = `https://${token}@github.com/${repo}.git`;
        await git.addConfig('user.name', 'Instagram Bot');
        await git.addConfig('user.email', 'bot@instagram.com');

        const status = await git.status();
        const archivoModificado = status.files.some(file => file.path.includes('posts.json'));

        if (archivoModificado) {
            await git.add('./posts.json');
            await git.commit('🤖 Actualización automática de posts (Realista)');
            await git.push(remoteUrl, 'main');
            console.log('¡Push completado a GitHub!');
        } else {
            console.log('No hay cambios nuevos en el archivo posts.json.');
        }

    } catch (error) {
        console.error('Error durante el proceso:', error);
        await browser.close();
    }
}

scrapearInstagramRealista();
