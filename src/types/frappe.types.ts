

export type FrappeSessionStatus = 
    | 'NOT_INITIALIZED' 
    | 'CONNECTING' 
    | 'QR_READY' 
    | 'CONNECTED' 
    | 'DISCONNECTED' 
    | 'ERROR' 
    | 'ERROR_SESSION_DIR' 
    | 'ERROR_QR_GENERATION' 
    | 'ERROR_INIT' 
    | 'ERROR_EVENT_HANDLER' 
    | 'DISCONNECTED_MANUAL' 
    | 'ERROR_DISCONNECT';

export interface FrappeClientTrackedState {
    status: FrappeSessionStatus;
    qrCodeDataUrl: string | null;
    lastError: string | null;
    messageUpdates?: Array<{ 
        type: string; 
        messageId: string; 
        status: string; 
        timestamp: string; 
        receivedAt: number; 
        [key: string]: any 
    }>;
}

