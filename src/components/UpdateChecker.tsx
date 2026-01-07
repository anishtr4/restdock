import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const UPDATER_ENDPOINT = "https://anishtr4.github.io/restdock_release/latest.json";

export const UpdateChecker = () => {
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                const currentVer = await getVersion();
                const response = await fetch(UPDATER_ENDPOINT);
                if (!response.ok) return;

                const data = await response.json();
                const latestVer = data.version.replace(/^v/, '');

                if (compareVersions(latestVer, currentVer) > 0) {
                    setUpdateInfo(data);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error('Failed to check for updates', error);
            }
        };

        const timer = setTimeout(checkUpdate, 2000);
        return () => clearTimeout(timer);
    }, []);

    const compareVersions = (v1: string, v2: string) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if ((parts1[i] || 0) > (parts2[i] || 0)) return 1;
            if ((parts1[i] || 0) < (parts2[i] || 0)) return -1;
        }
        return 0;
    };

    const getDownloadUrl = () => {
        if (!updateInfo?.platforms) return null;

        const userAgent = navigator.userAgent;
        if (userAgent.includes("Win")) return updateInfo.platforms['windows-x86_64']?.url;
        if (userAgent.includes("Linux")) return updateInfo.platforms['linux-x86_64']?.url;
        if (userAgent.includes("Mac")) {
            // Check for Apple Silicon vs Intel if possible, otherwise just return Silicon?
            // Actually, best to give user a choice or link to release page if ambiguous.
            // But let's try to grab aarch64 if we assume most users are on modern macs, 
            // OR checks generic logic.
            // For safety, we can return the release page URL if we can't decide, 
            // but user asked for direct download.
            // Let's assume aarch64 for now or provide buttons for both?
            // Simplest: Link to the specific file if we can guess, else repo.
            return updateInfo.platforms['darwin-aarch64']?.url;
        }
        return null;
    };

    const handleDownload = async () => {
        const url = getDownloadUrl();
        if (url) {
            await openUrl(url);
        } else {
            // Fallback to releases page if direct link fails
            await openUrl(`https://github.com/anishtr4/restdock_release/releases/tag/${updateInfo.version}`);
        }
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Available</DialogTitle>
                    <DialogDescription>
                        <div className="text-base font-semibold mb-2">Version {updateInfo?.version} is available.</div>
                        <p className="text-sm text-muted-foreground">{updateInfo?.notes}</p>
                        {/* If we want to be fancy, we could list platform links here */}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Later</Button>
                    <Button onClick={handleDownload}>
                        Download Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
