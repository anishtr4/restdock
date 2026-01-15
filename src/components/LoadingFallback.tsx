import { useEffect, useState } from 'react';

export const LoadingFallback = () => {
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        // Create random thunder flashes
        const flashInterval = setInterval(() => {
            setFlash(true);
            setTimeout(() => setFlash(false), 100);
        }, 1500 + Math.random() * 1000); // Random interval between 1.5-2.5s

        return () => clearInterval(flashInterval);
    }, []);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none z-50 fixed inset-0 overflow-hidden">
            {/* Thunder Flash Effect */}
            <div
                className={`absolute inset-0 pointer-events-none transition-opacity duration-100 ${flash ? 'opacity-30' : 'opacity-0'
                    }`}
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(96, 165, 250, 0.4) 0%, transparent 60%)'
                }}
            />

            {/* Animated Lightning Bolts in Background */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                style={{ filter: 'blur(1px)' }}
            >
                <defs>
                    <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(96, 165, 250)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
                    </linearGradient>
                </defs>

                {/* Lightning bolt path 1 */}
                <path
                    d="M 30 0 L 35 40 L 25 40 L 32 80 L 22 70 L 28 100"
                    stroke="url(#lightning-gradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                    style={{
                        opacity: flash ? 0.8 : 0.1,
                        transition: 'opacity 0.1s ease-out',
                        animationDuration: '2s'
                    }}
                />

                {/* Lightning bolt path 2 */}
                <path
                    d="M calc(100% - 30px) 0 L calc(100% - 35px) 50 L calc(100% - 25px) 50 L calc(100% - 32px) 100 L calc(100% - 22px) 90 L calc(100% - 28px) 120"
                    stroke="url(#lightning-gradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                    style={{
                        opacity: flash ? 0.8 : 0.1,
                        transition: 'opacity 0.1s ease-out',
                        animationDuration: '2.5s',
                        animationDelay: '0.5s'
                    }}
                />
            </svg>

            <div className="flex flex-col items-center justify-center animate-fade-in relative z-10">
                <div className="relative mb-8">
                    {/* Logo with Thunder Glow Effect */}
                    <div className="w-32 h-32 relative z-10">
                        <img
                            src="/logo.png"
                            alt="RestDock Logo"
                            className={`w-full h-full object-contain transition-all duration-100 ${flash ? 'brightness-125 drop-shadow-[0_0_20px_rgba(96,165,250,0.8)]' : 'brightness-100'
                                }`}
                        />
                    </div>

                    {/* Dynamic Backlight with Flash Effect */}
                    <div
                        className={`absolute inset-0 blur-3xl rounded-full scale-150 z-0 transition-all duration-100 ${flash
                                ? 'bg-blue-400/60 opacity-80 scale-[2]'
                                : 'bg-primary/20 opacity-50 scale-150'
                            }`}
                    />

                    {/* Electric Arc Effect */}
                    {flash && (
                        <div className="absolute inset-0 z-20">
                            <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-blue-400 via-blue-300 to-transparent opacity-60 blur-sm animate-ping"
                                style={{ animationDuration: '0.3s', transform: 'translateX(-50%) rotate(10deg)' }} />
                            <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-blue-400 via-blue-300 to-transparent opacity-60 blur-sm animate-ping"
                                style={{ animationDuration: '0.3s', transform: 'translateX(-50%) rotate(-10deg)' }} />
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h1 className={`text-3xl font-bold tracking-tight font-sans transition-all duration-100 ${flash ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'text-foreground/90'
                        }`}>
                        RestDock
                    </h1>

                    {/* Thunder-Themed Progress Bar */}
                    <div className="h-1 w-32 bg-secondary/50 rounded-full overflow-hidden mt-2 relative">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 origin-left animate-[grow_1.5s_ease-out_forwards] w-full" />
                        {flash && (
                            <div className="absolute inset-0 bg-blue-300/50 animate-pulse" style={{ animationDuration: '0.3s' }} />
                        )}
                    </div>

                    <p className={`text-xs text-muted-foreground mt-1 transition-opacity duration-100 ${flash ? 'opacity-100' : 'opacity-60'
                        }`}>
                        Powering up...
                    </p>
                </div>
            </div>

            {/* Particle Effect on Flash */}
            {flash && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping"
                            style={{
                                top: '50%',
                                left: '50%',
                                animationDuration: '0.5s',
                                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-${50 + i * 10}px)`,
                                opacity: 0.6
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
