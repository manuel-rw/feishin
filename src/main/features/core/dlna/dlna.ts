import axios from 'axios';
import * as dgram from 'dgram';
import { ipcMain } from 'electron';
import { XMLParser } from 'fast-xml-parser';
import z from 'zod';

const parser = new XMLParser();

const deviceSchema = z.object({
    root: z.object({
        device: z.object({
            friendlyName: z.string(),
        }),
    }),
});

interface DlnaDevice {
    name: string;
    url: string;
}

export const initializeDlna = () => {
    ipcMain.handle('dlna-discover', async () => {
        const devices: Map<string, DlnaDevice> = new Map();

        for await (const deviceUrl of discoverDeviceUrls()) {
            const device = await getDevice(deviceUrl);
            if (!device) continue;

            devices.set(device.url, device);
        }

        return Array.from(devices.values());
    });
};

async function* discoverDeviceUrls(): AsyncGenerator<string, void, unknown> {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const discoveredDevices = new Set<string>();

    const SSDP_PORT = 1900;
    const SSDP_ADDRESS = '239.255.255.250';
    const SEARCH_TARGET = 'urn:schemas-upnp-org:device:MediaRenderer:1';

    const searchMessage = Buffer.from(
        `M-SEARCH * HTTP/1.1\r\n` +
            `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\n` +
            `MAN: "ssdp:discover"\r\n` +
            `MX: 3\r\n` +
            `ST: ${SEARCH_TARGET}\r\n` +
            `\r\n`,
    );

    const deviceQueue: string[] = [];
    let resolver: (() => void) | null = null;
    let done = false;

    socket.on('message', (msg) => {
        const response = msg.toString();

        const locationMatch = response.match(/LOCATION:\s*(.+)/i);
        if (!locationMatch) return;

        const location = locationMatch[1].trim();
        if (discoveredDevices.has(location)) return;

        discoveredDevices.add(location);
        deviceQueue.push(location);
        console.log('SSDP discovered device:', location);
        if (resolver) {
            resolver();
            resolver = null;
        }
    });

    socket.on('error', (err) => {
        console.error('SSDP socket error:', err);
        socket.close();
        done = true;
        if (resolver) {
            resolver();
            resolver = null;
        }
    });

    socket.bind(() => {
        socket.send(searchMessage, 0, searchMessage.length, SSDP_PORT, SSDP_ADDRESS, (err) => {
            if (err) console.error('Failed to send SSDP search:', err);
        });

        setTimeout(() => {
            socket.close();
            done = true;
            if (resolver) {
                resolver();
                resolver = null;
            }
        }, 5000);
    });

    while (!done || deviceQueue.length > 0) {
        if (deviceQueue.length > 0) {
            yield deviceQueue.shift()!;
        } else if (!done) {
            await new Promise<void>((resolve) => (resolver = resolve));
        }
    }
}

const getDevice = async (deviceUrl: string) => {
    try {
        const { data } = await axios.get(deviceUrl, { timeout: 2000 });
        const parsed = parser.parse(data);

        const upnpResult = await deviceSchema.safeParseAsync(parsed);
        if (!upnpResult.success) {
            console.log('Unable to parse device description XML', { deviceUrl });
            return null;
        }

        const device = {
            name: upnpResult.data.root.device.friendlyName,
            url: deviceUrl,
        };
        return device;
    } catch (error) {
        console.error(`Failed to get device info from ${deviceUrl}:`, error);
        return null;
    }
};
