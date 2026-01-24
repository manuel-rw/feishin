import MediaRendererClient from 'upnp-mediarenderer-client';
import { DlnaPlayStream } from '/@/shared/types/types';

const ERR_NOT_INITIALIZED = Error('DLNA client not initialized');

let client: MediaRendererClient | null = null;

export const setDevice = (deviceUrl: string) => {
    client = new MediaRendererClient(deviceUrl);
};

const getClient = () => {
    if (!client) {
        console.error(ERR_NOT_INITIALIZED);
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

export const getTime = async () =>
    new Promise<number>((resolve, reject) => {
        const client = getClient();
        if (!client) return reject(ERR_NOT_INITIALIZED);

        client.getPosition((err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
