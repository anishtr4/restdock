import { getVersion } from '@tauri-apps/api/app';

export const UPDATER_ENDPOINT = "https://raw.githubusercontent.com/anishtr4/restdock_release/main/latest.json";

export interface UpdateInfo {
    version: string;
    notes: string;
    pub_date: string;
    platforms: Record<string, { url: string; signature: string }>;
}

export const checkUpdate = async (): Promise<UpdateInfo | null> => {
    try {
        const currentVer = await getVersion();
        const response = await fetch(UPDATER_ENDPOINT, { cache: 'no-store' }); // Prevent caching
        if (!response.ok) throw new Error('Failed to fetch update info');

        const data: UpdateInfo = await response.json();
        const latestVer = data.version.replace(/^v/, '');

        if (compareVersions(latestVer, currentVer) > 0) {
            return data;
        }
        return null;
    } catch (error) {
        console.error('Failed to check for updates', error);
        throw error;
    }
};

const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((parts1[i] || 0) > (parts2[i] || 0)) return 1;
        if ((parts1[i] || 0) < (parts2[i] || 0)) return -1;
    }
    return 0;
};

export const getDownloadUrl = (info: UpdateInfo): string | null => {
    if (!info?.platforms) return null;

    const userAgent = navigator.userAgent;
    if (userAgent.includes("Win")) return info.platforms['windows-x86_64']?.url;
    if (userAgent.includes("Linux")) return info.platforms['linux-x86_64']?.url;
    if (userAgent.includes("Mac")) return info.platforms['darwin-aarch64']?.url;

    return null;
};
