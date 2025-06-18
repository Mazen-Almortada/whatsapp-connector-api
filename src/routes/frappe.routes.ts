import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createFrappeApiKeyMiddleware } from '../middlewares/key.middleware';
import * as FrappeController from '../controllers/frappe.controller';


export const createFrappeAPIRouter = () => {
    const app = new Hono<{ Variables: { sessionId: string } }>();

    app.use('/:sessionId/*', async (c, next) => {
        
        const sessionId = c.req.param('sessionId');

        if (!sessionId) {
            throw new HTTPException(400, { message: 'sessionId path parameters are required.' });
        }
       
        c.set('sessionId', sessionId);
        await next();
    });

    const frappeKeyAuth = createFrappeApiKeyMiddleware();
    app.use('*', frappeKeyAuth);
    
    app.get('/:sessionId/initiate', FrappeController.initiate);
    app.get('/:sessionId/status', FrappeController.status);
    app.post('/:sessionId/disconnect', FrappeController.disconnect);
    app.post('/:sessionId/send', FrappeController.sendMessage);

    return app;
};
