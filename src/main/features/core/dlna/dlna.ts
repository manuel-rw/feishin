import axios from 'axios';
import { Bonjour } from 'bonjour-service';
import * as dgram from 'dgram';
import { ipcMain } from 'electron';
import { XMLParser } from 'fast-xml-parser';
import z from 'zod';

const parser = new XMLParser();

const sonosDeviceSchema = z.object({
    root: z.object({ device: z.object({ displayName: z.string(), roomName: z.string() }) }),
});

const upnpDeviceSchema = z.object({
    root: z.object({
        device: z.object({
            friendlyName: z.string(),
        }),
    }),
});

const discoverSSDPDevices = (): Promise<Set<string>> => {
    return new Promise((resolve) => {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        const devices = new Set<string>();

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

        socket.on('message', (msg) => {
            const response = msg.toString();
            const locationMatch = response.match(/LOCATION:\s*(.+)/i);
            if (locationMatch) {
                const location = locationMatch[1].trim();
                devices.add(location);
                console.log('SSDP discovered device:', location);
            }
        });

        socket.on('error', (err) => {
            console.error('SSDP socket error:', err);
            socket.close();
            resolve(devices);
        });

        socket.bind(() => {
            socket.send(searchMessage, 0, searchMessage.length, SSDP_PORT, SSDP_ADDRESS, (err) => {
                if (err) {
                    console.error('Failed to send SSDP search:', err);
                }
            });

            setTimeout(() => {
                socket.close();
                resolve(devices);
            }, 5000);
        });
    });
};

export const initializeDlna = () => {
    ipcMain.handle('dlna-discover', async () => {
        const bonjour = new Bonjour();
        const devices: Map<string, { name: string; url: string }> = new Map();

        const processDevice = async (deviceUrl: string) => {
            try {
                const { data } = await axios.get(deviceUrl, { timeout: 2000 });
                const parsed = parser.parse(data);

                const sonosResult = await sonosDeviceSchema.safeParseAsync(parsed);
                if (sonosResult.success) {
                    devices.set(deviceUrl, {
                        name: `${sonosResult.data.root.device.roomName} ⦁ ${sonosResult.data.root.device.displayName}`,
                        url: deviceUrl,
                    });
                    return;
                }

                const upnpResult = await upnpDeviceSchema.safeParseAsync(parsed);
                if (upnpResult.success) {
                    devices.set(deviceUrl, {
                        name: upnpResult.data.root.device.friendlyName,
                        url: deviceUrl,
                    });
                    return;
                }

                console.log('Unable to parse device description XML', { deviceUrl });
            } catch (error) {
                console.error(`Failed to get device info from ${deviceUrl}:`, error);
            }
        };

        const ssdpDevices = await discoverSSDPDevices();
        const ssdpPromises = Array.from(ssdpDevices).map((url) => processDevice(url));

        const bonjourPromise = new Promise<void>((resolve) => {
            bonjour.find({ type: 'sonos' }, async (service) => {
                if ('location' in service.txt && typeof service.txt.location === 'string') {
                    console.log('mDNS discovered Sonos device:', service.txt.location);
                    await processDevice(service.txt.location);
                }
            });

            setTimeout(() => {
                bonjour.destroy();
                resolve();
            }, 5000);
        });

        await Promise.all([...ssdpPromises, bonjourPromise]);

        return Array.from(devices.values());
    });
};
