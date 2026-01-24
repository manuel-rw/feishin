import { useEffect } from 'react';

import { usePlaybackSettings, usePlayerActions, usePlayerSong, usePlayerStatus } from '/@/renderer/store';
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
        if (!song || !songUrl || status !== PlayerStatus.PLAYING) return;

        dlnaPlayer?.play({
            metadata: {
                album: song.album,
                artist: song.artistName,
                title: song.name,
            },
            url: songUrl,
        });
    }, [song, song?.id, status]);

    useEffect(() => {
        dlnaPlayerListener?.rendererDlnaFinished(() => mediaNext());
        return () => ipc?.removeAllListeners('renderer-dlna-finished');
    }, [mediaNext]);

    return null;
};
