import { useEffect, useState } from 'react';

export const LoadingFallback = () => {
    const [strike, setStrike] = useState(false);

    useEffect(() => {
        // Thunder strike every 2-3 seconds
        const strikeInterval = setInterval(() => {
            setStrike(true);
            setTimeout(() => setStrike(false), 600); // Strike lasts 600ms
        }, 2000 + Math.random() * 1000);

        return () => clearInterval(strikeInterval);
    }, []);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none z-50 fixed inset-0 overflow-hidden">
            {/* Thunder Strike Lightning Bolt */}
            {strike && (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-30"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid slice"
                >
                    <defs>
                        <linearGradient id="lightning-strike" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Main lightning bolt striking down */}
                    <path
                        d="M 48 0 L 50 20 L 47 20 L 52 40 L 48 40 L 54 65 L 49 65 L 50 100"
                        stroke="url(#lightning-strike)"
                        strokeWidth="1.5"
                        fill="none"
                        filter="url(#glow)"
                        className="animate-[lightning-strike_0.3s_ease-out]"
                        strokeLinecap="round"
                        style={{
                            opacity: 0.95,
                        }}
                    />

                    {/* Secondary branch */}
                    <path
                        d="M 50 35 L 45 50 L 40 65"
                        stroke="url(#lightning-strike)"
                        strokeWidth="1"
                        fill="none"
                        filter="url(#glow)"
                        className="animate-[lightning-strike_0.3s_ease-out_0.05s]"
                        strokeLinecap="round"
                        style={{
                            opacity: 0.7,
                        }}
                    />

                    {/* Third branch */}
                    <path
                        d="M 52 30 L 57 45 L 60 55"
                        stroke="url(#lightning-strike)"
                        strokeWidth="0.8"
                        fill="none"
                        filter="url(#glow)"
                        className="animate-[lightning-strike_0.3s_ease-out_0.08s]"
                        strokeLinecap="round"
                        style={{
                            opacity: 0.6,
                        }}
                    />
                </svg>
            )}

            {/* Bright Screen Flash on Strike */}
            <div
                className={`absolute inset-0 pointer-events-none transition-opacity z-20 ${strike ? 'opacity-40 duration-100' : 'opacity-0 duration-300'
                    }`}
                style={{
                    background: 'radial-gradient(ellipse at 50% 70%, rgba(147, 197, 253, 0.6) 0%, rgba(96, 165, 250, 0.3) 30%, transparent 70%)'
                }}
            />

            {/* Ground Impact Effect */}
            {strike && (
                <>
                    {/* Impact flash at logo */}
                    <div
                        className="absolute z-25 pointer-events-none"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '200px',
                            height: '200px',
                        }}
                    >
                        <div className="w-full h-full bg-blue-400/40 rounded-full blur-3xl animate-ping" style={{ animationDuration: '0.6s' }} />
                    </div>

                    {/* Electric sparks radiating from impact */}
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute z-25 pointer-events-none"
                            style={{
                                top: '50%',
                                left: '50%',
                                width: '3px',
                                height: `${20 + Math.random() * 30}px`,
                                background: 'linear-gradient(to bottom, #60a5fa, transparent)',
                                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-60px)`,
                                opacity: 0.8,
                                animation: 'spark-fade 0.4s ease-out forwards'
                            }}
                        />
                    ))}

                    {/* Ground shockwave */}
                    <div
                        className="absolute pointer-events-none z-25"
                        style={{
                            top: '55%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '300px',
                            height: '10px',
                            background: 'radial-gradient(ellipse, rgba(96, 165, 250, 0.6) 0%, transparent 70%)',
                            borderRadius: '50%',
                            animation: 'shockwave 0.6s ease-out forwards'
                        }}
                    />
                </>
            )}

            <div className="flex flex-col items-center justify-center animate-fade-in relative z-10">
                <div className="relative mb-8">
                    {/* Logo with Strike Effect */}
                    <div className="w-32 h-32 relative z-10">
                        <img
                            src="/logo.png"
                            alt="RestDock Logo"
                            className={`w-full h-full object-contain transition-all duration-100 ${strike
                                    ? 'brightness-150 saturate-150 drop-shadow-[0_0_30px_rgba(59,130,246,1)]'
                                    : 'brightness-100'
                                }`}
                        />
                    </div>

                    {/* Dynamic Backlight */}
                    <div
                        className={`absolute inset-0 blur-3xl rounded-full z-0 transition-all ${strike
                                ? 'bg-blue-500/80 opacity-90 scale-[2.5] duration-100'
                                : 'bg-primary/20 opacity-50 scale-150 duration-500'
                            }`}
                    />
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h1 className={`text-3xl font-bold tracking-tight font-sans transition-all duration-100 ${strike
                            ? 'text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)] scale-105'
                            : 'text-foreground/90 scale-100'
                        }`}>
                        RestDock
                    </h1>

                    {/* Thunder-Themed Progress Bar */}
                    <div className="h-1 w-32 bg-secondary/50 rounded-full overflow-hidden mt-2 relative">
                        <div className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 origin-left animate-[grow_1.5s_ease-out_forwards] w-full" />
                        {strike && (
                            <div className="absolute inset-0 bg-blue-300/70 animate-pulse" style={{ animationDuration: '0.3s' }} />
                        )}
                    </div>

                    <p className={`text-xs font-mono mt-1 transition-all duration-100 ${strike ? 'text-blue-400 opacity-100' : 'text-muted-foreground opacity-60'
                        }`}>
                        ⚡ Powering up...
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes lightning-strike {
                    0% {
                        stroke-dasharray: 200;
                        stroke-dashoffset: 200;
                        opacity: 0;
                    }
                    20% {
                        opacity: 1;
                    }
                    100% {
                        stroke-dasharray: 200;
                        stroke-dashoffset: 0;
                        opacity: 0.9;
                    }
                }
                
                @keyframes spark-fade {
                    0% {
                        opacity: 0.8;
                        transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-60px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-80px) scale(0.5);
                    }
                }
                
                @keyframes shockwave {
                    0% {
                        width: 100px;
                        opacity: 0.8;
                    }
                    100% {
                        width: 400px;
                        opacity: 0;
                    }
                }
                
                @keyframes grow {
                    from {
                        transform: scaleX(0);
                    }
                    to {
                        transform: scaleX(1);
                    }
                }
            `}</style>
        </div>
    );
};
