import { useEffect, useState } from 'react';

export const LoadingFallback = () => {
    const [strike, setStrike] = useState(false);

    useEffect(() => {
        // Thunder strike every 2 seconds
        const strikeInterval = setInterval(() => {
            setStrike(true);
            setTimeout(() => setStrike(false), 600);
        }, 2000);

        return () => clearInterval(strikeInterval);
    }, []);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none z-50 fixed inset-0 overflow-hidden">

            {/* BRIGHT YELLOW LIGHTNING BOLT FROM SKY */}
            {strike && (
                <>
                    {/* Main vertical lightning bolt - VERY VISIBLE */}
                    <div
                        className="absolute z-50"
                        style={{
                            top: '0px',
                            left: '50%',
                            width: '12px',
                            height: '50%',
                            marginLeft: '-6px',
                            background: 'linear-gradient(180deg, #fbbf24 0%, #fef08a 30%, #fbbf24 60%, #3b82f6 100%)',
                            boxShadow: `
                                0 0 30px 10px rgba(251, 191, 36, 0.9),
                                0 0 60px 20px rgba(250, 204, 21, 0.6),
                                0 0 90px 30px rgba(96, 165, 250, 0.4)
                            `,
                            filter: 'brightness(2)',
                            animation: 'lightning-strike 0.4s ease-out',
                        }}
                    />

                    {/* Left branch */}
                    <div
                        className="absolute z-50"
                        style={{
                            top: '20%',
                            left: '50%',
                            width: '50px',
                            height: '8px',
                            marginLeft: '-50px',
                            background: 'linear-gradient(90deg, transparent, #fbbf24)',
                            boxShadow: '0 0 20px 6px rgba(251, 191, 36, 0.8)',
                            filter: 'brightness(2)',
                            transform: 'rotate(-30deg)',
                            transformOrigin: 'right center',
                            animation: 'lightning-strike 0.4s ease-out 0.1s backwards',
                        }}
                    />

                    {/* Right branch */}
                    <div
                        className="absolute z-50"
                        style={{
                            top: '35%',
                            left: '50%',
                            width: '40px',
                            height: '8px',
                            background: 'linear-gradient(90deg, #fbbf24, transparent)',
                            boxShadow: '0 0 20px 6px rgba(251, 191, 36, 0.8)',
                            filter: 'brightness(2)',
                            transform: 'rotate(25deg)',
                            transformOrigin: 'left center',
                            animation: 'lightning-strike 0.4s ease-out 0.15s backwards',
                        }}
                    />
                </>
            )}

            {/* Bright Screen Flash */}
            <div
                className={`absolute inset-0 pointer-events-none z-40 transition-all ${strike ? 'opacity-60 duration-100' : 'opacity-0 duration-300'
                    }`}
                style={{
                    background: 'radial-gradient(ellipse at 50% 40%, rgba(251, 191, 36, 0.5) 0%, rgba(250, 204, 21, 0.3) 30%, rgba(96, 165, 250, 0.2) 50%, transparent 80%)'
                }}
            />

            {/* Impact Effects */}
            {strike && (
                <div className="absolute z-45" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    {/* Bright impact flash */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-125px',
                            left: '-125px',
                            width: '250px',
                            height: '250px',
                            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.9) 0%, rgba(96, 165, 250, 0.5) 50%, transparent 80%)',
                            animation: 'impact-pulse 0.6s ease-out',
                        }}
                    />

                    {/* Electric sparks */}
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                width: '6px',
                                height: '40px',
                                left: '-3px',
                                top: '-20px',
                                background: 'linear-gradient(180deg, #fbbf24, #fef08a, transparent)',
                                boxShadow: '0 0 10px 3px rgba(251, 191, 36, 0.8)',
                                transform: `rotate(${i * 22.5}deg) translateY(-70px)`,
                                transformOrigin: 'center',
                                animation: 'spark-fade 0.5s ease-out forwards',
                            }}
                        />
                    ))}

                    {/* Ground impact wave */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-80px',
                            left: '-100px',
                            width: '200px',
                            height: '30px',
                            background: 'radial-gradient(ellipse, rgba(251, 191, 36, 0.9) 0%, rgba(251, 191, 36, 0.5) 40%, transparent 70%)',
                            borderRadius: '50%',
                            animation: 'shockwave 0.7s ease-out forwards',
                        }}
                    />
                </div>
            )}

            {/* Logo and Content */}
            <div className="flex flex-col items-center justify-center relative z-30">
                <div className="relative mb-8">
                    <div className="w-32 h-32 relative z-10">
                        <img
                            src="/icon.png"
                            alt="RestDock Logo"
                            className={`w-full h-full object-contain transition-all duration-150 ${strike
                                ? 'brightness-[2.5] saturate-150 drop-shadow-[0_0_50px_rgba(251,191,36,1)] scale-125'
                                : 'brightness-100 scale-100'
                                }`}
                        />
                    </div>

                    <div
                        className={`absolute inset-0 blur-3xl rounded-full z-0 transition-all ${strike
                            ? 'bg-yellow-400/90 opacity-100 scale-[3.5] duration-150'
                            : 'bg-primary/20 opacity-50 scale-150 duration-500'
                            }`}
                    />
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h1 className={`text-3xl font-bold tracking-tight font-sans transition-all duration-150 ${strike
                        ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(251,191,36,1)] scale-110'
                        : 'text-foreground/90 scale-100'
                        }`}>
                        RestDock
                    </h1>

                    <div className="h-1 w-32 bg-secondary/50 rounded-full overflow-hidden mt-2 relative">
                        <div className="h-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 origin-left animate-[grow_1.8s_ease-out_forwards] w-full" />
                        {strike && (
                            <div className="absolute inset-0 bg-yellow-200/90 animate-pulse" style={{ animationDuration: '0.3s' }} />
                        )}
                    </div>

                    <p className={`text-sm font-bold mt-1 transition-all duration-150 tracking-wider ${strike ? 'text-yellow-400 opacity-100 scale-110' : 'text-muted-foreground/80 opacity-80 scale-100'
                        }`}>
                        {strike ? '⚡ THUNDER STRIKE! ⚡' : '⚡ Powering up...'}
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes lightning-strike {
                    0% {
                        opacity: 0;
                        transform: scaleY(0);
                        filter: brightness(3);
                    }
                    10% {
                        opacity: 1;
                    }
                    50% {
                        transform: scaleY(1);
                        filter: brightness(2.5);
                    }
                    100% {
                        opacity: 0.95;
                        transform: scaleY(1);
                        filter: brightness(2);
                    }
                }
                
                @keyframes impact-pulse {
                    0% {
                        opacity: 0;
                        transform: scale(0.3);
                    }
                    40% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(2);
                    }
                }
                
                @keyframes spark-fade {
                    0% {
                        opacity: 1;
                        height: 40px;
                    }
                    100% {
                        opacity: 0;
                        height: 70px;
                    }
                }
                
                @keyframes shockwave {
                    0% {
                        width: 200px;
                        opacity: 1;
                    }
                    100% {
                        width: 600px;
                        opacity: 0;
                    }
                }
                
                @keyframes grow {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
};
