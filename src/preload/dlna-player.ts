import { ipcRenderer, IpcRendererEvent } from 'electron';
import { DlnaInitialize, DlnaSong } from '/@/shared/types/types';

const discover = () => {
    return ipcRenderer.invoke('dlna-discover');
};

const initialize = (data: DlnaInitialize) => {
    return ipcRenderer.invoke('dlna-initialize', data);
};

const play = (song: DlnaSong) => {
    ipcRenderer.send('dlna-play', song);
};

const rendererDlnaFinished = (cb: (event: IpcRendererEvent, data: boolean) => void) => {
    ipcRenderer.on('renderer-dlna-finished', cb);
};

export const dlnaPlayer = {
    discover,
    initialize,
    play,
};

export const dlnaPlayerListener = {
    rendererDlnaFinished,
};

export type DlnaPLayer = typeof dlnaPlayer;
export type DlnaPlayerListener = typeof dlnaPlayerListener;
