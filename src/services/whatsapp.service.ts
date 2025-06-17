import * as whatsapp from 'wa-multi-session';
import { toDataURL } from 'qrcode';
import { env } from '../env';
import { updateState, getState, getOrCreateState } from './frappeState.service';

type InitiateSessionResponse = {
    sessionId: string;
    status: string;
    qr_code: string | null;
    message: string;
};


export const initializeWhatsApp = () => {
  console.log('[WhatsApp Service] Initializing...');
  const credentialsDir = env.SESSIONS_PARENT_DIR;
  console.log(`[WhatsApp Service] Using credentials/sessions directory: '${credentialsDir}'`);
  whatsapp.setCredentialsDir(credentialsDir);
  whatsapp.loadSessionsFromStorage();

  setupGlobalEventListeners();
};


function setupGlobalEventListeners() {
    console.log("[WhatsApp Service] Setting up global event listeners for background sync...");

    whatsapp.onConnecting((sessionId: string) => {
        console.log(`[Global Event] Session '${sessionId}' connecting...`);
        updateState(sessionId, { status: 'CONNECTING', qrCodeDataUrl: null });
    });

    whatsapp.onConnected((sessionId: string) => {
        console.log(`[Global Event] Session '${sessionId}' connected.`);
        updateState(sessionId, { status: 'CONNECTED', qrCodeDataUrl: null, lastError: null });
    });

    whatsapp.onDisconnected((sessionId: string) => {
        console.log(`[Global Event] Session '${sessionId}' disconnected.`);
        if (getState(sessionId)) {
            updateState(sessionId, { status: 'DISCONNECTED' });
        }
    });

    whatsapp.onQRUpdated(async ({ qr, sessionId }: { qr: string; sessionId: string }) => {
        console.log(`[Global Event] Session '${sessionId}' QR updated (background).`);
        try {
            const dataUrl = await toDataURL(qr);
            updateState(sessionId, { qrCodeDataUrl: dataUrl, status: 'QR_READY' });
        } catch (e: any) {
            console.error(`[Global Event] Session '${sessionId}' failed to convert QR to data URL:`, e.message);
            updateState(sessionId, { status: 'ERROR_QR_GENERATION', lastError: 'Failed to process QR in background.' });
        }
    });
}



export const initiateSession = async (sessionId: string, forceNew: boolean): Promise<InitiateSessionResponse> => {
    const state = getOrCreateState(sessionId);

    if (!forceNew && (state.status === 'CONNECTED' || state.status === 'QR_READY')) {
        return {
            sessionId,
            status: state.status,
            qr_code: state.qrCodeDataUrl,
            message: state.status === 'CONNECTED' ? 'Already connected.' : 'QR code is ready for scanning.',
        };
    }

    if (forceNew) {
        console.log(`[WhatsApp Service] Forcing new session for '${sessionId}'.`);
        await whatsapp.deleteSession(sessionId).catch(err => console.warn(`Could not delete session '${sessionId}', it might not exist.`, err.message));
    }
    
    updateState(sessionId, { status: 'CONNECTING', qrCodeDataUrl: null, lastError: null });

    return new Promise<InitiateSessionResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Timeout: QR code not generated in 25 seconds."));
        }, 25000);

        whatsapp.startSession(sessionId, {
            onQRUpdated: async (qr) => {
                clearTimeout(timeout);
                console.log(`[Initiate] QR received for session '${sessionId}'.`);
                try {
                    const dataUrl = await toDataURL(qr);
                    updateState(sessionId, { qrCodeDataUrl: dataUrl, status: 'QR_READY' });
                    resolve({ sessionId, status: 'QR_READY', qr_code: dataUrl, message: 'Scan QR code.' });
                } catch (e: any) {
                    reject(new Error("Failed to generate QR data URL from event."));
                }
            },
            onConnected: () => {
                clearTimeout(timeout);
                console.log(`[Initiate] Session '${sessionId}' connected.`);
                updateState(sessionId, { status: 'CONNECTED', qrCodeDataUrl: null, lastError: null });
                resolve({ sessionId, status: 'CONNECTED', qr_code: null, message: 'Session connected successfully.' });
            },
            onDisconnected: () => {
                clearTimeout(timeout);
                console.log(`[Initiate] Session '${sessionId}' disconnected during initiation.`);
                updateState(sessionId, { status: 'DISCONNECTED' });
                reject(new Error("Session disconnected during initiation process."));
            }
        }).catch(err => {
            clearTimeout(timeout);
            updateState(sessionId, { status: 'ERROR', lastError: err.message });
            reject(err);
        });
    });
};

export const disconnectSession = async (sessionId: string): Promise<void> => {
    console.log(`[WhatsApp Service] Disconnecting session '${sessionId}'.`);
    await whatsapp.deleteSession(sessionId);
};

interface SendMessageParams {
    type: 'Text' | 'Image' | 'Document' | 'Audio' | 'Video';
    sessionId: string;
    recipient: string;
    text?: string | null;
    media?: {
        base64: string;
        filename: string;
        mimetype: string;
    } | null;
}


export const sendMessage = async (params: SendMessageParams) => {
    const { type, sessionId, recipient, text, media } = params;
    const fullRecipientId = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;
    const options = { sessionId, to: fullRecipientId };

    console.log(`[WhatsApp Service] Sending ${type} message to ${fullRecipientId} via session '${sessionId}'`);

    switch (type) {
        case 'Text':
            if (!text) throw new Error('Text content is required for text messages.');
            return whatsapp.sendTextMessage({ ...options, text });

        case 'Image':
        case 'Document':
            if (!media) throw new Error(`Media data is required for ${type} messages.`);
            const mediaBuffer = Buffer.from(media.base64, 'base64');
            
            if(type === 'Image') {
                return whatsapp.sendImage({ ...options, text: text || undefined, media: mediaBuffer });
            } else { 
                return whatsapp.sendDocument({ ...options, text: text || undefined, media: mediaBuffer, filename: media.filename });
            }
        
        default:
            throw new Error(`Unsupported message type: ${type}`);
    }
};
