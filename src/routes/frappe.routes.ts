import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createFrappeApiKeyMiddleware } from '../middlewares/key.middleware';
import * as FrappeController from '../controllers/frappe.controller';


export const createFrappeAPIRouter = () => {
    const app = new Hono<{ Variables: { siteId: string; sessionId: string } }>();

    app.use('/:siteId/:sessionId/*', async (c, next) => {
        const siteId = c.req.param('siteId');
        const sessionId = c.req.param('sessionId');

        if (!siteId || !sessionId) {
            throw new HTTPException(400, { message: 'Both siteId and sessionId path parameters are required.' });
        }
        c.set('siteId', siteId);
        c.set('sessionId', sessionId);
        await next();
    });

    const frappeKeyAuth = createFrappeApiKeyMiddleware();
    app.use('*', frappeKeyAuth);
    
    app.get('/:siteId/:sessionId/initiate', FrappeController.initiate);
    app.get('/:siteId/:sessionId/status', FrappeController.status);
    app.post('/:siteId/:sessionId/disconnect', FrappeController.disconnect);
    app.post('/:siteId/:sessionId/send', FrappeController.sendMessage);

    return app;
};
