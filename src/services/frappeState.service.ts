
import { FrappeClientTrackedState } from "../types/frappe.types";
import * as whatsapp from 'wa-multi-session';

const frappeClientStates: { [siteId: string]: FrappeClientTrackedState } = {};


export const getState = (siteId: string): FrappeClientTrackedState | undefined => {
    return frappeClientStates[siteId];
};


export const getOrCreateState = (siteId: string): FrappeClientTrackedState => {
    if (!frappeClientStates[siteId]) {
        frappeClientStates[siteId] = {
            status: 'NOT_INITIALIZED',
            qrCodeDataUrl: null,
            lastError: null,
            messageUpdates: [],
        };
        


        const existingSession = whatsapp.getSession(siteId);
        if (existingSession?.authState?.creds?.me) {
            frappeClientStates[siteId].status = 'CONNECTED';
            console.log(`[State Service] Primed state for '${siteId}' as CONNECTED on creation.`);
        }
    }
    return frappeClientStates[siteId];
};

export const updateState = (siteId: string, partialState: Partial<FrappeClientTrackedState>): FrappeClientTrackedState => {
    const existingState = getOrCreateState(siteId);
    const newState = { ...existingState, ...partialState };
    frappeClientStates[siteId] = newState;
    return newState;
};

export const syncStateWithLibrary = (siteId: string): FrappeClientTrackedState => {
    const clientState = getOrCreateState(siteId);
    const libSession = whatsapp.getSession(siteId);

    if (libSession?.authState?.creds?.me) {
        if (clientState.status !== 'CONNECTED') {
            console.log(`[State Service] Syncing state for '${siteId}': lib confirms CONNECTED, our state was ${clientState.status}.`);
            updateState(siteId, { status: 'CONNECTED', qrCodeDataUrl: null, lastError: null });
        }
    } else {
        if (clientState.status === 'CONNECTED') {
             console.warn(`[State Service] Syncing state for '${siteId}': Our state was CONNECTED, but lib doesn't confirm. Setting to DISCONNECTED.`);
            updateState(siteId, { status: 'DISCONNECTED', lastError: "Session mismatch with library." });
        }

        else if (clientState.status === 'QR_READY' && !libSession) {
            console.warn(`[State Service] Syncing state for '${siteId}': Our state was QR_READY, but no session in lib. Setting to DISCONNECTED.`);
            updateState(siteId, { status: 'DISCONNECTED', lastError: "QR session lost.", qrCodeDataUrl: null });
        }
    }
    return getState(siteId)!;
};
