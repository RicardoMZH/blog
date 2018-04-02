const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite');
const Koa = require('koa');
const Router = require('koa-router');
const static = require('koa-static');
const views = require('koa-views');
const bodyParser = require('koa-bodyparser');
const marked = require('marked');

const app = new Koa();
const router = new Router();
const renderer = new marked.Renderer();

renderer.listitem = function(text) {
    if (/^\s*\[[x ]\]\s*/.test(text)) {
        text = text
        .replace(/^\s*\[ \]\s*/, '<input disabled type="checkbox">')
        .replace(/^\s*\[x\]\s*/, '<input checked disabled type="checkbox">');
        return '<li style="list-style: none">' + text + '</li>';
    } else {
        return '<li>' + text + '</li>';
    }
};
marked.setOptions({
  renderer: renderer,
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false
});

async function main() {
    app.use(static(path.join(__dirname + '/static')));
    app.use(views(path.join(__dirname + '/views'),{extension: 'ejs'}));
    app.use(bodyParser());

    const database_config = JSON.parse(fs.readFileSync("./config/database.json").toString());
    const dbPromise = sqlite.open(database_config.database_location, { Promise });

    const db = await dbPromise;
    let blog_info = null;
    let archives = null;
    let total = null;
    let page_num = null;
    let tags = null;

    async function get_blog_info() {
        blog_info = await db.get('SELECT * FROM blog_info');
        archives = await db.all('SELECT blog_archive,count(*) AS article_count FROM blog_data GROUP BY blog_archive ORDER BY article_count DESC LIMIT 4');
        await db.get('UPDATE blog_info SET view_count = view_count+1');
    }

    router.get('homepage','/', async function (ctx, next) {
        await get_blog_info();
        total = await db.get('SELECT count(*) AS total FROM blog_data');
        total = total.total;
        page_num = Math.floor((total%10)?(total/10+1):(total/10));
        let articles = await db.all('SELECT * FROM blog_data ORDER BY blog_post_date DESC LIMIT 10');
        for (let article of articles){
            article['blog_preview'] = marked(article['blog_preview'],{ renderer: renderer });
            article['blog_tag'] = article['blog_tag'].split(/[,，，]/);
        }
        ctx.state.render_data = { 'blog_info': blog_info, 'articles': articles, 'archives':archives, 'page_num':page_num, 'current':1, 'url':ctx.url};
        await ctx.render('index', ctx.state.render_data);
    });
    router.get('homepages','/page/:current',async function (ctx, next) {
        await get_blog_info();
        total = await db.get('SELECT count(*) AS total FROM blog_data');
        total = total.total;
        page_num = Math.floor((total%10)?(total/10+1):(total/10));
        let articles = await db.all('SELECT * FROM blog_data ORDER BY blog_post_date DESC LIMIT 10 OFFSET ?', 10*(ctx.params.current-1));
        if (JSON.stringify(articles) == '{}' || JSON.stringify(articles) == '[]') {
            ctx.redirect('/404');
        }
        for (let article of articles){
            article['blog_preview'] = marked(article['blog_preview'],{ renderer: renderer });
        }
        ctx.state.render_data = { 'blog_info': blog_info, 'articles': articles, 'archives':archives, 'page_num':page_num, 'current':ctx.params.current, 'url':ctx.url};
        await ctx.render('index', ctx.state.render_data);
    });

    router.get('blogpage','/blog/:blog_name', async function (ctx, next) {
        await get_blog_info();
        let article = await db.get('SELECT * FROM blog_data WHERE blog_name = ?', ctx.params.blog_name);
        if (JSON.stringify(article) == '{}' || JSON.stringify(article) == '[]') {
            ctx.redirect('/404');
        }
        article['blog_info'] = marked(article['blog_info'],{ renderer: renderer });
        article['blog_tag'] = article['blog_tag'].split(/[,，，]/);
        ctx.state.render_data = { 'blog_info': blog_info, 'article': article, 'archives':archives}
        await ctx.render('blog', ctx.state.render_data);
        await db.get('UPDATE blog_data SET blog_view_count = blog_view_count+1 WHERE blog_name = ?', ctx.params.blog_name);
    });

    router.get('archivepage','/archive/:archive_name', async function (ctx, next) {
        await get_blog_info();
        let articles = await db.all('SELECT blog_name,blog_title,blog_post_date FROM blog_data WHERE blog_archive = ? ORDER BY blog_post_date DESC LIMIT 10', ctx.params.archive_name);
        if (JSON.stringify(articles) == '{}' || JSON.stringify(articles) == '[]') {
            ctx.redirect('/404');
        }
        let total = await db.get('SELECT count(*) AS total FROM blog_data WHERE blog_archive = ?', ctx.params.archive_name);
        total = total.total;
        page_num = Math.floor((total%10)?(total/10+1):(total/10));
        ctx.state.render_data = { 'blog_info': blog_info, 'articles': articles, 'archives':archives, 'archive_name':ctx.params.archive_name, 'total':total, 'page_num':page_num, 'current':1, 'url':ctx.url};
        await ctx.render('archive', ctx.state.render_data);
    });
    router.get('archivepages','/archive/:archive_name/page/:current',async function (ctx, next) {
        await get_blog_info();
        let articles = await db.all('SELECT blog_name,blog_title,blog_post_date FROM blog_data WHERE blog_archive = ? ORDER BY blog_post_date DESC LIMIT 10 OFFSET ?', ctx.params.archive_name,10*(ctx.params.current-1));
        if (JSON.stringify(articles) == '{}' || JSON.stringify(articles) == '[]') {
            ctx.redirect('/404');
        }
        let total = await db.get('SELECT count(*) AS total FROM blog_data WHERE blog_archive = ?', ctx.params.archive_name);
        total = total.total;
        page_num = Math.floor((total%10)?(total/10+1):(total/10));
        ctx.state.render_data = { 'blog_info': blog_info, 'articles': articles, 'archives':archives, 'archive_name':ctx.params.archive_name, 'total':total, 'page_num':page_num, 'current':ctx.params.current, 'url':ctx.url};
        await ctx.render('archive', ctx.state.render_data);
    });

    router.get('tagpage','/tag/:tag_name', async function (ctx, next) {
        let tag_name = new Array();
        tag_name[0] = ctx.params.tag_name;
        tag_name[1] = '%，' + ctx.params.tag_name + '，%';
        tag_name[2] = '%，' + ctx.params.tag_name + '%';
        tag_name[3] = '%' + ctx.params.tag_name + '，%';
        await get_blog_info();
        let articles = await db.all('SELECT blog_name,blog_title,blog_post_date FROM blog_data WHERE blog_tag LIKE ? OR ? OR ? OR ? ORDER BY blog_post_date DESC LIMIT 10', tag_name);
        if (JSON.stringify(articles) == '{}' || JSON.stringify(articles) == '[]') {
            ctx.redirect('/404');
        }
        let total = await db.get('SELECT count(*) AS total FROM blog_data WHERE blog_tag LIKE ? OR ? OR ? OR ?', tag_name);
        total = total.total;
        page_num = Math.floor((total%10)?(total/10+1):(total/10));
        ctx.state.render_data = { 'blog_info': blog_info, 'articles': articles, 'archives':archives, 'tag_name':ctx.params.tag_name, 'total':total, 'page_num':page_num, 'current':1, 'url':ctx.url};
        await ctx.render('tag', ctx.state.render_data);
    });
    router.get('tagpages','/tag/:tag_name/page/:current',async function (ctx, next) {
        await get_blog_info();
        let tag_name = new Array();
        tag_name[0] = ctx.params.tag_name;
        tag_name[1] = '%，' + ctx.params.tag_name + '，%';
        tag_name[2] = '%，' + ctx.params.tag_name + '%';
        tag_name[3] = '%' + ctx.params.tag_name + '，%';
        tag_name[4] = 10*(ctx.params.current-1);
        let articles = await db.all('SELECT blog_name,blog_title,blog_post_date FROM blog_data WHERE blog_tag LIKE ? OR ? OR ? OR ? ORDER BY blog_post_date DESC LIMIT 10 OFFSET ?', tag_name);
        if (JSON.stringify(articles) == '{}' || JSON.stringify(articles) == '[]') {
            ctx.redirect('/404');
        }
        tag_name.pop();
        let total = await db.get('SELECT count(*) AS total FROM blog_data WHERE blog_tag LIKE ? OR ? OR ? OR ?', tag_name);
        total = total.total;
        page_num = Math.floor((total%10)?(total/10+1):(total/10));
        ctx.state.render_data = { 'blog_info': blog_info, 'articles': articles, 'archives':archives, 'tag_name':ctx.params.tag_name, 'total':total, 'page_num':page_num, 'current':ctx.params.current, 'url':ctx.url};
        await ctx.render('tag', ctx.state.render_data);
    });

    router.get('archivespage','/archives', async function (ctx, next) {
        await get_blog_info();
        total = await db.get('SELECT count(*) AS total FROM blog_data');
        total = total.total;
        archives = await db.all('SELECT blog_archive,count(*) AS article_count FROM blog_data GROUP BY blog_archive ORDER BY article_count DESC LIMIT 4');
        all_archives = await db.all('SELECT blog_archive,count(*) AS article_count FROM blog_data GROUP BY blog_archive ORDER BY article_count DESC');
        ctx.state.render_data = { 'blog_info': blog_info, 'archives':archives, 'total':total, 'all_archives':all_archives};
        await ctx.render('archives', ctx.state.render_data);
    });

    router.get('aboutme','/about-me', async (ctx, next) => {
        await get_blog_info();
        ctx.state.render_data = { 'blog_info': blog_info, 'archives':archives};
        await ctx.render('aboutme', ctx.state.render_data);
    });

    router.get('friends','/friends', async (ctx, next) => {
        await get_blog_info();
        ctx.state.render_data = { 'blog_info': blog_info, 'archives':archives};
        await ctx.render('friends', ctx.state.render_data);
    });

    router.post('searchresult','/searchresult', async (ctx, next) => {
        await get_blog_info();
        if (ctx.request.body['searchtext'] =='') {ctx.redirect('/404');}
        let searchtext = '%' + ctx.request.body['searchtext'] + '%';
        let articles = await db.all('SELECT blog_name,blog_title,blog_post_date FROM blog_data WHERE blog_name LIKE ? OR blog_title LIKE ? OR blog_info LIKE ?',searchtext,searchtext,searchtext);
        ctx.state.render_data = { 'blog_info': blog_info, 'archives':archives, 'articles':articles, 'searchtext':ctx.request.body['searchtext']};
        await ctx.render('searchresult', ctx.state.render_data);
    });

    router.get('page404','*', async (ctx, next) => {
        await get_blog_info();
        ctx.state.render_data = { 'blog_info': blog_info, 'archives':archives};
        await ctx.render('404', ctx.state.render_data);
    });

    // router.use(pages.routes(), pages.allowedMethods());
    app.use(router.routes());
    app.listen(3000);
}

main();
