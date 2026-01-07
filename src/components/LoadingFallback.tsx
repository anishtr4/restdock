

export const LoadingFallback = () => (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none z-50 fixed inset-0">
        <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="relative mb-8">
                {/* Professional Logo Display */}
                {/* Professional Logo Display */}
                <div className="w-32 h-32 relative z-10">
                    <img
                        src="/logo.png"
                        alt="RestDock Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                {/* Subtle backlight driven by theme */}
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 z-0 opacity-50" />
            </div>

            <div className="flex flex-col items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground/90 font-sans">RestDock</h1>

                {/* Minimalist Progress Indicator */}
                <div className="h-1 w-32 bg-secondary/50 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary origin-left animate-[grow_1.5s_ease-out_forwards] w-full" />
                </div>
            </div>
        </div>
    </div>
);
