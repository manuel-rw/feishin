import { ipcRenderer, IpcRendererEvent } from 'electron';
import { DlnaInitialize, DlnaStreamInfo } from '/@/shared/types/types';

const discover = () => {
    return ipcRenderer.invoke('dlna-discover');
};

const initialize = (data: DlnaInitialize) => ipcRenderer.invoke('dlna-initialize', data);

const load = (song: DlnaStreamInfo) => ipcRenderer.send('dlna-load', song);

const play = () => ipcRenderer.send('dlna-play');

const pause = () => ipcRenderer.send('dlna-pause');

const stop = () => ipcRenderer.send('dlna-stop');

const getCurrentTime = () => ipcRenderer.invoke('dlna-get-time') as Promise<number>;

const seekTo = (seconds: number) => ipcRenderer.send('dlna-seek-to', seconds);

const setVolume = (value: number) => ipcRenderer.send('dlna-volume', value);

const rendererDlnaFinished = (cb: (event: IpcRendererEvent, data: boolean) => void) => {
    ipcRenderer.on('renderer-dlna-finished', cb);
};

export const dlnaPlayer = {
    discover,
    initialize,
    load,
    play,
    pause,
    stop,
    getCurrentTime,
    seekTo,
    setVolume,
};

export const dlnaPlayerListener = {
    rendererDlnaFinished,
};

export type DlnaPLayer = typeof dlnaPlayer;
export type DlnaPlayerListener = typeof dlnaPlayerListener;
