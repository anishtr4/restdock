import { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { checkUpdate } from '@/lib/updater';

interface UpdateCheckerProps {
    onUpdateAvailable?: (hasUpdate: boolean) => void;
}

export const UpdateChecker = ({ onUpdateAvailable }: UpdateCheckerProps) => {
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const runCheck = async () => {
            try {
                const info = await checkUpdate();
                if (info) {
                    setUpdateInfo(info);
                    setIsOpen(true);
                    onUpdateAvailable?.(true);
                } else {
                    onUpdateAvailable?.(false);
                }
            } catch (error) {
                // Silent error for auto-check
                onUpdateAvailable?.(false);
            }
        };

        const timer = setTimeout(runCheck, 2000);
        return () => clearTimeout(timer);
    }, [onUpdateAvailable]);

    const getDownloadUrl = () => {
        if (!updateInfo?.platforms) return null;

        const userAgent = navigator.userAgent;
        if (userAgent.includes("Win")) return updateInfo.platforms['windows-x86_64']?.url;
        if (userAgent.includes("Linux")) return updateInfo.platforms['linux-x86_64']?.url;
        if (userAgent.includes("Mac")) {
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
