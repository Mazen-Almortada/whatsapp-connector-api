import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as FrappeState from '../services/frappeState.service';
import * as WhatsApp from '../services/whatsapp.service';


export const initiate = async (c: Context) => {
    const sessionId = c.get('sessionId'); 
    const forceNewQR = c.req.query('forceNewQR') === 'true';

    try {
        console.log(`[Controller] Initiating session '${sessionId}'. Force new: ${forceNewQR}`);
        const result = await WhatsApp.initiateSession(sessionId, forceNewQR);
        return c.json(result);
    } catch (error: any) {
        console.error(`[Controller] Error initiating session '${sessionId}':`, error.message);
        throw new HTTPException(500, { message: `Failed to initiate session: ${error.message}` });
    }
};

export const status = async (c: Context) => {
    const sessionId = c.get('sessionId'); 
    const state = FrappeState.syncStateWithLibrary(sessionId);

    return c.json({
        sessionId: sessionId,
        status: state.status,
        qr_code: state.status === 'QR_READY' ? state.qrCodeDataUrl : null,
        last_error: state.lastError,
        message: `Current status for ${sessionId}: ${state.status}`,
    });
};

export const disconnect = async (c: Context) => {
    const sessionId = c.get('sessionId'); 

    try {
        console.log(`[Controller] Disconnecting session '${sessionId}'.`);
        await WhatsApp.disconnectSession(sessionId);
        return c.json({ sessionId, status: 'Disconnected', message: 'Session disconnected successfully.' });
    } catch (error: any) {
        console.error(`[Controller] Error disconnecting session '${sessionId}':`, error.message);
        FrappeState.updateState(sessionId, { status: 'ERROR_DISCONNECT', lastError: error.message });
        throw new HTTPException(500, { message: `Failed to disconnect: ${error.message}` });
    }
};


const sendMessageSchema = z.object({
    recipient: z.string().min(1),
    message_type: z.enum(['Text', 'Image', 'Document', 'Audio', 'Video']),
    message: z.string().optional(),
    media: z.object({
        base64: z.string(),
        filename: z.string(),
        mimetype: z.string(),
    }).optional(),
    options: z.object({
        caption: z.string().optional(),
    }).optional().default({}),
});


export const sendMessage = async (c: Context) => {
    const sessionId = c.get('sessionId');
    const clientState = FrappeState.getState(sessionId);

    if (clientState?.status !== 'CONNECTED') {
        throw new HTTPException(400, { message: `Session '${sessionId}' is not connected. Current status: ${clientState?.status || 'NOT_INITIALIZED'}` });
    }

    const payload = await c.req.json();
    const validationResult = sendMessageSchema.safeParse(payload);

    if (!validationResult.success) {
        throw new HTTPException(400, { message: 'Invalid request payload.', cause: validationResult.error.issues });
    }
    const { recipient, message_type, message, media, options } = validationResult.data;

    try {
        const responseFromLib = await WhatsApp.sendMessage({
            type: message_type,
            sessionId,
            recipient,
            text: message || options.caption,
            media,
        });

        const messageId = responseFromLib?.key?.id;
        if (!messageId) {
            console.error(`[Controller] Send successful, but no messageId in response:`, responseFromLib);
            throw new HTTPException(500, { message: "Message sent but no ID was returned." });
        }

        console.log(`[Controller] Message sent successfully via session '${sessionId}', ID: ${messageId}`);
        return c.json({ sessionId, success: true, message_id: messageId });
    } catch (error: any) {
        console.error(`[Controller] Error sending message via session '${sessionId}':`, error.message);
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, { message: `Failed to send message: ${error.message}` });
    }
};
