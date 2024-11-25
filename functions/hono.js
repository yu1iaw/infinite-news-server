import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { Hono } from 'hono';
import { handle } from 'hono/netlify';

config();
const app = new Hono();

app.get('/api', async (c) => {
    return c.html('<h1>Hello, <i>HONO</i>!</h1>', 200);
})

app.get('/api/news', async c => {
    const sql = neon(process.env.DATABASE_URL);
    const { uuid } = c.req.query();

    const news = await sql`
        SELECT id, news_id, category_id, image, title, publish_date FROM news
        WHERE user_id = ${uuid}
        ORDER BY publish_date DESC;
    `
    return c.json({ data: news }, 200)
})

app.get('/api/news/:id', async c => {
    const sql = neon(process.env.DATABASE_URL);
    const id = c.req.param('id');
    const { uuid } = c.req.query();

    const newsId = await sql`
        SELECT news_id FROM news
        WHERE id = ${id}
        AND user_id = ${uuid};
    `
    return c.json({ data: newsId }, 200)
})

app.post('/api/news', async c => {
    const sql = neon(process.env.DATABASE_URL);
    const { id, user_id, category_id, title, text, summary, source_country, language, url, image, video, author, publish_date } = await c.req.json();

    const [userId, newsId] = await sql.transaction([
        sql`
            INSERT into users
            VALUES(${user_id})
            ON CONFLICT(id)
            DO NOTHING
            RETURNING id;
        `,
        sql`
            INSERT into news(id, user_id, category_id, title, text, summary, source_country, language, url, image, video, author, publish_date)
            VALUES(${id}, ${user_id}, ${category_id}, ${title}, ${text}, ${summary}, ${source_country}, ${language}, ${url}, ${image}, ${video}, ${author}, ${publish_date})
            ON CONFLICT(id, user_id)
            DO NOTHING
            RETURNING news_id;
        `
    ])

    return c.json({ success: true, result: newsId }, 201)
})

app.delete('/api/news', async c => {
    const sql = neon(process.env.DATABASE_URL);
    const { uuid, newsId, categoryId } = await c.req.json();
    let ids;
    if (newsId) {
        ids = await sql`
            DELETE from news
            WHERE id = ${newsId}
            AND user_id = ${uuid}
            RETURNING news_id;
        `
    } else if (categoryId) {
        ids = await sql`
            DELETE from news
            WHERE category_id = ${categoryId}
            AND user_id = ${uuid}
            RETURNING news_id;
        `
    }

    return c.json({ deleted: ids })
})


export default handle(app);