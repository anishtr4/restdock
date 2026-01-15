import { useEffect, useState } from 'react';

export const LoadingFallback = () => {
    const [strike, setStrike] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Dramatic lightning strike loop
        const strikeInterval = setInterval(() => {
            setStrike(true);
            setTimeout(() => setStrike(false), 200); // Quick, sharp flash
        }, 3500);

        // Simulated loading progress
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 5, 100));
        }, 150);

        return () => {
            clearInterval(strikeInterval);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground overflow-hidden selection:bg-cyan-500/30">

            {/* AMBIENT BACKGROUND EFFECTS */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Gradient glow - subtle blue in light, deep blue in dark */}
                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-blue-100/50 to-transparent dark:from-blue-900/20 dark:to-transparent opacity-50" />

                {/* Subtle grid pattern - adaptive opacity */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] bg-[length:40px_40px]"
                    style={{
                        backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`
                    }}
                />
            </div>

            {/* LIGHTNING STRIKE ANIMATION */}
            {strike && (
                <>
                    {/* Main Bolt - Yellow/Gold in both modes */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-2 h-[45vh] bg-yellow-500 dark:bg-yellow-300 shadow-[0_0_30px_5px_rgba(234,179,8,0.5)] dark:shadow-[0_0_50px_15px_rgba(250,204,21,0.6)] origin-top animate-strike-down" />

                    {/* Screen Flash Overlay - Warm flash */}
                    <div className="absolute inset-0 bg-yellow-100/40 dark:bg-yellow-100/10 z-50 pointer-events-none animate-flash-fade" />

                    {/* Impact Burst at Center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div className="w-[300px] h-[300px] bg-yellow-500/20 dark:bg-yellow-400/30 rounded-full blur-[80px] animate-pulse-fast" />
                    </div>
                </>
            )}

            {/* MAIN CONTENT CONTAINER */}
            <div className="relative z-40 flex flex-col items-center">

                {/* LOGO CONTAINER */}
                <div className="relative mb-12">
                    {/* Glowing ring behind logo */}
                    <div className="absolute inset-0 rounded-3xl bg-yellow-500/10 dark:bg-yellow-500/20 blur-xl scale-90 animate-pulse-slow" />

                    {/* Icon */}
                    <div className={`relative w-32 h-32 transition-all duration-300 ${strike ? 'scale-105 brightness-110 dark:brightness-125' : 'scale-100'}`}>
                        <img
                            src="/icon.png?v=3"
                            alt="RestDock"
                            className="w-full h-full object-contain drop-shadow-xl dark:drop-shadow-2xl rounded-2xl"
                        />

                        {/* Electric Arcs on Logo (CSS generated) */}
                        <div className="absolute -inset-4 border border-yellow-400/30 dark:border-yellow-400/30 rounded-[2rem] opacity-0 animate-spin-slow group-hover:opacity-100" />
                    </div>
                </div>

                {/* APP NAME */}
                <h1 className="text-4xl font-bold tracking-tight mb-2 font-display text-foreground">
                    Rest<span className="text-yellow-600 dark:text-yellow-400">Dock</span>
                </h1>

                {/* SUBTITLE */}
                <p className="text-muted-foreground text-sm tracking-widest uppercase mb-8 opacity-80">
                    Initializing Environment
                </p>

                {/* PROGRESS BAR */}
                <div className="w-64 h-1.5 bg-secondary/50 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 dark:from-yellow-600 dark:via-yellow-400 dark:to-yellow-600 transition-all duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Glint effect on bar */}
                    <div className="absolute inset-y-0 left-0 w-full bg-white/30 dark:bg-white/20 -translate-x-full animate-shimmer" />
                </div>
            </div>

            {/* CSS ANIMATIONS */}
            <style>{`
                @keyframes strike-down {
                    0% { transform: translateX(-50%) scaleY(0); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateX(-50%) scaleY(1); opacity: 0; }
                }
                @keyframes flash-fade {
                    0% { opacity: 0.2; }
                    100% { opacity: 0; }
                }
                @keyframes pulse-fast {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-strike-down { animation: strike-down 0.2s ease-out forwards; }
                .animate-flash-fade { animation: flash-fade 0.3s ease-out forwards; }
                .animate-pulse-fast { animation: pulse-fast 0.4s ease-out forwards; }
                .animate-shimmer { animation: shimmer 2s infinite; }
            `}</style>
        </div>
    );
};
