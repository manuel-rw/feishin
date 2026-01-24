import MediaRendererClient from 'upnp-mediarenderer-client';

let client: MediaRendererClient | null = null;

export const setDevice = (deviceUrl: string) => {
    client = new MediaRendererClient(deviceUrl);
};

export const playOnSpeaker = (url: string, metadata: string) => {
    if (!client) {
        console.error('Cannot play: DLNA client not initialized');
        return;
    }
    client.load(
        url,
        {
            autoplay: true,
            contentType: 'audio/ogg',
            metadata: metadata, // This shows the Artist/Title on the speaker's screen
        },
        (err: any) => {
            if (err) console.error('DLNA playback error:', err);
            else console.log('DLNA playback started successfully');
        },
    );
};
