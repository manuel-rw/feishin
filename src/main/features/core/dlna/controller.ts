import MediaRendererClient from 'upnp-mediarenderer-client';
import { DlnaPlayStream } from '/@/shared/types/types';

let client: MediaRendererClient | null = null;

export const setDevice = (deviceUrl: string) => {
    client = new MediaRendererClient(deviceUrl);
};

const getClient = () => {
    if (!client) {
        console.error('DLNA client not initialized');
        return null;
    }
    return client;
};

export const load = (stream: DlnaPlayStream) => {
    getClient()?.load(
        stream.url,
        {
            autoplay: stream.autoplay || false,
            contentType: stream.mimeType,
            metadata: stream.metadata,
        },
        (err: any) => {
            if (err) console.error('DLNA playback error:', err);
            else console.log('DLNA playback started successfully');
        },
    );
};

export const play = () => getClient()?.play();
export const pause = () => getClient()?.pause();
