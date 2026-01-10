const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const cheerio = require('cheerio');

const IGNORE = ['.git', 'node_modules', 'ativos', 'includes'];

function toAtivosPath(orig) {
  if (!orig || /^(https?:)?\/\//i.test(orig) || orig.startsWith('data:') || orig.startsWith('/')) return orig;
  const ext = orig.split('.').pop().toLowerCase();
  if (['mp4','webm'].includes(ext)) return `/ativos/videos/${path.basename(orig)}`;
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return `/ativos/images/${path.basename(orig)}`;
  if (['css'].includes(ext)) return `/ativos/css/${path.basename(orig)}`;
  if (['js'].includes(ext)) return `/ativos/js/${path.basename(orig)}`;
  return `/${orig}`;
}

// --- NOVA FUNÇÃO MÁGICA PARA INJETAR O CSS ---
function ensureCss($, filePath) {
    const cssPath = '/ativos/css/style.css';
    // Se já tiver o link, não faz nada para não duplicar
    if ($(`link[href*="${cssPath}"]`).length) return false;
    
    // Adiciona o link do CSS no final do <head>
    const cssLink = `<link rel="stylesheet" href="${cssPath}">`;
    if ($('head').length) {
        $('head').append(cssLink);
    } else {
        // Se não tiver a tag <head>, cria uma
        $('html').prepend(`<head>${cssLink}</head>`);
    }
    return true;
}
// -------------------------------------------

function ensureHeader($, filePath) {
  if (path.basename(filePath).toLowerCase() === 'index.html') return false;
  if ($('video.logo-animada').length) return false;
  // Header padrão com a classe para o CSS pegar
  const headerHtml = `<header class="subpage-header"><video class="logo-animada" autoplay muted loop playsinline><source src="/ativos/videos/logo-animada.gif.mp4" type="video/mp4"></video></header>`;
  $('body').prepend(headerHtml);
  return true;
}

function ensureFooter($) {
  if ($('.site-footer').length) return false;
  // Footer padrão com a classe para o CSS pegar
  const footerHtml = `<footer class="site-footer"><img src="/ativos/images/logopercyatual.jpeg" alt="Percy Contabilidade" class="footer-logo"><p>© 2026 Percy Contabilidade</p></footer>`;
  $('body').append(footerHtml);
  return true;
}

(async function main(){
  console.log("Iniciando correção de caminhos e injeção de estilos...");
  const files = glob.sync("**/*.html", {ignore: ["node_modules/**", ".git/**", "ativos/**"]});
  let processedCount = 0;
  for (const f of files) {
    try {
      let content = await fs.readFile(f, 'utf8');
      const $ = cheerio.load(content, {decodeEntities:false});

      // Corrige caminhos de imagens, vídeos e scripts
      $('img, video, source, link, script').each((i,el)=> {
          const attr = $(el).is('link') ? 'href' : 'src';
          const v = $(el).attr(attr);
          if(v) $(el).attr(attr, toAtivosPath(v));
      });

      // --- APLICA AS INJEÇÕES ---
      const cssInjected = ensureCss($, f);
      const headerInjected = ensureHeader($, f);
      const footerInjected = ensureFooter($);
      // --------------------------
      
      await fs.writeFile(f, $.html(), 'utf8');
      processedCount++;
    } catch (err) { console.error(`Erro ao processar ${f}: ${err}`); }
  }
  console.log(`Concluído! ${processedCount} arquivos processados com sucesso.`);
  console.log("As regras de estilo Diamante foram aplicadas.");
})();