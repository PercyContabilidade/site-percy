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

function ensureHeader($, filePath) {
  if (path.basename(filePath).toLowerCase() === 'index.html') return false;
  if ($('video.logo-animada').length) return false;
  const headerHtml = `<header class="subpage-header"><video class="logo-animada" autoplay muted loop playsinline><source src="/ativos/videos/logo-animada.gif.mp4" type="video/mp4"></video></header>`;
  $('body').prepend(headerHtml);
  return true;
}

function ensureFooter($) {
  if ($('.site-footer').length) return false;
  const footerHtml = `<footer class="site-footer"><img src="/ativos/images/logopercyatual.jpeg" alt="Percy Contabilidade" class="footer-logo"><p>© 2026 Percy Contabilidade</p></footer>`;
  $('body').append(footerHtml);
  return true;
}

(async function main(){
  const results = [];
  const files = glob.sync("**/*.html", {ignore: ["node_modules/**", ".git/**", "ativos/**"]});
  for (const f of files) {
    try {
      let content = await fs.readFile(f, 'utf8');
      const $ = cheerio.load(content, {decodeEntities:false});
      const changes = [];

      $('img').each((i,el)=> { const v = $(el).attr('src'); $(el).attr('src', toAtivosPath(v)); });
      $('video, source').each((i,el)=> { const v = $(el).attr('src'); $(el).attr('src', toAtivosPath(v)); });
      $('link').each((i,el)=> { const v = $(el).attr('href'); $(el).attr('href', toAtivosPath(v)); });
      $('script').each((i,el)=> { const v = $(el).attr('src'); $(el).attr('src', toAtivosPath(v)); });

      const headerInjected = ensureHeader($, f);
      const footerInjected = ensureFooter($);
      await fs.writeFile(f, $.html(), 'utf8');
      results.push({file:f, headerInjected, footerInjected});
    } catch (err) { console.error(err); }
  }
  console.log(JSON.stringify(results, null, 2));
})();