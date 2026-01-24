import mime from 'mime';

import { useEffect } from 'react';

import {
    usePlaybackSettings,
    usePlayerActions,
    usePlayerSong,
    usePlayerStatus,
} from '/@/renderer/store';
import { PlayerStatus } from '/@/shared/types/types';
import isElectron from 'is-electron';
import { useSongUrl } from '/@/renderer/features/player/audio-player/hooks/use-stream-url';

const dlnaPlayer = isElectron() ? window.api.dlnaPlayer : null;
const dlnaPlayerListener = isElectron() ? window.api.dlnaPlayerListener : null;
const ipc = isElectron() ? window.api.ipc : null;

export const DlnaPlayer = () => {
    const song = usePlayerSong();
    const status = usePlayerStatus();
    const { mediaNext } = usePlayerActions();
    const { transcode } = usePlaybackSettings();

    const songUrl = useSongUrl(song, true, transcode);

    useEffect(() => {
        if (!song || status !== PlayerStatus.PLAYING) return;

        if (!song.path) {
            console.error(`Loading song #${song.id}: no path`);
            return;
        }

        const mimeType = mime.getType(song.path);
        if (!mimeType) {
            console.error(`Loading song '${song.path}': cannot infer mime type`);
            return;
        }

        if (!songUrl) {
            console.error(`Loading song '${song.path}': no url`);
            return;
        }

        dlnaPlayer?.load({
            metadata: { creator: song.artistName, title: song.name, type: 'music' },
            mimeType,
            autoplay: status === PlayerStatus.PLAYING,
            url: songUrl,
        });
    }, [song, song?.id, songUrl]);

    useEffect(() => {
        switch (status) {
            case PlayerStatus.PAUSED:
                dlnaPlayer?.pause();
                break;
            case PlayerStatus.PLAYING:
                dlnaPlayer?.play();
                break;
            default:
                console.error(`Unknown player status '${status}'`);
        }
    }, [status]);

    useEffect(() => {
        dlnaPlayerListener?.rendererDlnaFinished(() => mediaNext());
        return () => ipc?.removeAllListeners('renderer-dlna-finished');
    }, [mediaNext]);

    return null;
};
