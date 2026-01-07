import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const UpdateChecker = () => {
    const [updateAvailable, setUpdateAvailable] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                const update = await check();
                if (update?.available) {
                    setUpdateAvailable(update);
                    setOpen(true);
                }
            } catch (error) {
                console.error('Failed to check for updates', error);
            }
        };
        // Check after 2 seconds to not block startup
        const timer = setTimeout(checkUpdate, 2000);
        return () => clearTimeout(timer);
    }, []);

    const installUpdate = async () => {
        if (!updateAvailable) return;
        setDownloading(true);
        try {
            await updateAvailable.downloadAndInstall();
            await relaunch();
        } catch (e) {
            console.error(e);
            setDownloading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Available</DialogTitle>
                    <DialogDescription>
                        <div>Version {updateAvailable?.version} is available.</div>
                        <div className="mt-2 text-xs text-muted-foreground">{updateAvailable?.body}</div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={downloading}>Later</Button>
                    <Button onClick={installUpdate} disabled={downloading}>
                        {downloading ? "Updating..." : "Update Now"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
