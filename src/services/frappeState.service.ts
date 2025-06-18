
import { FrappeClientTrackedState } from "../types/frappe.types";
import * as whatsapp from 'wa-multi-session';

const frappeClientStates: { [sessionId: string]: FrappeClientTrackedState } = {};


export const getState = (sessionId: string): FrappeClientTrackedState | undefined => {
    return frappeClientStates[sessionId];
};


export const getOrCreateState = (sessionId: string): FrappeClientTrackedState => {
    if (!frappeClientStates[sessionId]) {
        frappeClientStates[sessionId] = {
            status: 'NOT_INITIALIZED',
            qrCodeDataUrl: null,
            lastError: null,
            messageUpdates: [],
        };
        


        const existingSession = whatsapp.getSession(sessionId);
        if (existingSession?.authState?.creds?.me) {
            frappeClientStates[sessionId].status = 'CONNECTED';
            console.log(`[State Service] Primed state for '${sessionId}' as CONNECTED on creation.`);
        }
    }
    return frappeClientStates[sessionId];
};

export const updateState = (sessionId: string, partialState: Partial<FrappeClientTrackedState>): FrappeClientTrackedState => {
    const existingState = getOrCreateState(sessionId);
    const newState = { ...existingState, ...partialState };
    frappeClientStates[sessionId] = newState;
    return newState;
};

export const syncStateWithLibrary = (sessionId: string): FrappeClientTrackedState => {
    const clientState = getOrCreateState(sessionId);
    const libSession = whatsapp.getSession(sessionId);

    if (libSession?.authState?.creds?.me) {
        if (clientState.status !== 'CONNECTED') {
            console.log(`[State Service] Syncing state for '${sessionId}': lib confirms CONNECTED, our state was ${clientState.status}.`);
            updateState(sessionId, { status: 'CONNECTED', qrCodeDataUrl: null, lastError: null });
        }
    } else {
        if (clientState.status === 'CONNECTED') {
             console.warn(`[State Service] Syncing state for '${sessionId}': Our state was CONNECTED, but lib doesn't confirm. Setting to DISCONNECTED.`);
            updateState(sessionId, { status: 'DISCONNECTED', lastError: "Session mismatch with library." });
        }

        else if (clientState.status === 'QR_READY' && !libSession) {
            console.warn(`[State Service] Syncing state for '${sessionId}': Our state was QR_READY, but no session in lib. Setting to DISCONNECTED.`);
            updateState(sessionId, { status: 'DISCONNECTED', lastError: "QR session lost.", qrCodeDataUrl: null });
        }
    }
    return getState(sessionId)!;
};
