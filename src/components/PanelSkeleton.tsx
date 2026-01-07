import { Skeleton } from "@/components/ui/skeleton";

export const PanelSkeleton = () => {
    return (
        <div className="w-full h-full p-4 flex flex-col gap-4 animate-pulse">
            <div className="flex items-center justify-between border-b pb-4">
                <Skeleton className="h-8 w-1/3" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
};
