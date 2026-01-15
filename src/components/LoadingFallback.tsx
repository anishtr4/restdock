import { useEffect, useState } from 'react';

export const LoadingFallback = () => {
    const [strike, setStrike] = useState(false);

    useEffect(() => {
        // Thunder strike every 2.5 seconds
        const strikeInterval = setInterval(() => {
            setStrike(true);
            setTimeout(() => setStrike(false), 800);
        }, 2500);

        return () => clearInterval(strikeInterval);
    }, []);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none z-50 fixed inset-0 overflow-hidden">

            {/* ACTUAL LIGHTNING BOLT STRIKING DOWN */}
            {strike && (
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {/* Main lightning bolt - thick blue line from top to center */}
                    <div
                        className="absolute left-1/2 bg-gradient-to-b from-blue-400 via-blue-300 to-blue-500"
                        style={{
                            top: '0',
                            width: '8px',
                            height: '50vh',
                            marginLeft: '-4px',
                            boxShadow: '0 0 20px 8px rgba(59, 130, 246, 0.8), 0 0 40px 15px rgba(96, 165, 250, 0.5)',
                            animation: 'strike-down 0.3s ease-out forwards',
                            filter: 'brightness(1.5)',
                        }}
                    />

                    {/* Lightning bolt zigzag effect - LEFT */}
                    <div
                        className="absolute bg-blue-400"
                        style={{
                            top: '15vh',
                            left: 'calc(50% - 30px)',
                            width: '30px',
                            height: '6px',
                            transform: 'rotate(-30deg)',
                            boxShadow: '0 0 15px 5px rgba(96, 165, 250, 0.8)',
                            animation: 'strike-down 0.3s ease-out 0.1s forwards',
                            opacity: 0
                        }}
                    />

                    {/* Lightning bolt zigzag effect - RIGHT */}
                    <div
                        className="absolute bg-blue-400"
                        style={{
                            top: '25vh',
                            left: 'calc(50% + 10px)',
                            width: '25px',
                            height: '5px',
                            transform: 'rotate(30deg)',
                            boxShadow: '0 0 15px 5px rgba(96, 165, 250, 0.8)',
                            animation: 'strike-down 0.3s ease-out 0.15s forwards',
                            opacity: 0
                        }}
                    />

                    {/* Glow at the top */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                            top: '-50px',
                            width: '100px',
                            height: '100px',
                            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.8) 0%, transparent 70%)',
                            animation: 'pulse 0.5s ease-out',
                        }}
                    />
                </div>
            )}

            {/* Bright Screen Flash */}
            <div
                className={`absolute inset-0 pointer-events-none z-30 transition-opacity ${strike ? 'opacity-50 duration-100' : 'opacity-0 duration-500'
                    }`}
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(147, 197, 253, 0.6) 0%, rgba(96, 165, 250, 0.4) 40%, transparent 80%)'
                }}
            />

            {/* Impact Effects at Logo */}
            {strike && (
                <div className="absolute z-35 pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    {/* Impact flash */}
                    <div
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                            width: '250px',
                            height: '250px',
                            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.6) 0%, transparent 70%)',
                            animation: 'impact-flash 0.6s ease-out',
                        }}
                    />

                    {/* Sparks radiating out */}
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute"
                            style={{
                                width: '4px',
                                height: '30px',
                                background: 'linear-gradient(to bottom, #60a5fa, transparent)',
                                transform: `rotate(${i * 30}deg) translateY(-80px)`,
                                transformOrigin: 'bottom center',
                                animation: 'spark-burst 0.5s ease-out forwards',
                                left: '50%',
                                top: '50%',
                                marginLeft: '-2px',
                            }}
                        />
                    ))}

                    {/* Ground shockwave */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-60px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '100px',
                            height: '20px',
                            background: 'radial-gradient(ellipse, rgba(96, 165, 250, 0.8) 0%, transparent 70%)',
                            borderRadius: '50%',
                            animation: 'shockwave 0.6s ease-out forwards'
                        }}
                    />
                </div>
            )}

            {/* Logo and Content */}
            <div className="flex flex-col items-center justify-center animate-fade-in relative z-10">
                <div className="relative mb-8">
                    <div className="w-32 h-32 relative z-10">
                        <img
                            src="/logo.png"
                            alt="RestDock Logo"
                            className={`w-full h-full object-contain transition-all duration-150 ${strike
                                    ? 'brightness-200 saturate-150 drop-shadow-[0_0_40px_rgba(59,130,246,1)] scale-110'
                                    : 'brightness-100 scale-100'
                                }`}
                        />
                    </div>

                    <div
                        className={`absolute inset-0 blur-3xl rounded-full z-0 transition-all ${strike
                                ? 'bg-blue-500/90 opacity-100 scale-[3] duration-150'
                                : 'bg-primary/20 opacity-50 scale-150 duration-500'
                            }`}
                    />
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h1 className={`text-3xl font-bold tracking-tight font-sans transition-all duration-150 ${strike
                            ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,1)] scale-110'
                            : 'text-foreground/90 scale-100'
                        }`}>
                        RestDock
                    </h1>

                    <div className="h-1 w-32 bg-secondary/50 rounded-full overflow-hidden mt-2 relative">
                        <div className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 origin-left animate-[grow_1.8s_ease-out_forwards] w-full" />
                        {strike && (
                            <div className="absolute inset-0 bg-blue-300/80 animate-pulse" style={{ animationDuration: '0.4s' }} />
                        )}
                    </div>

                    <p className={`text-xs font-mono mt-1 transition-all duration-150 ${strike ? 'text-blue-400 opacity-100 font-bold' : 'text-muted-foreground opacity-60'
                        }`}>
                        {strike ? '⚡ STRIKE! ⚡' : '⚡ Powering up...'}
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes strike-down {
                    0% {
                        opacity: 0;
                        transform: scaleY(0);
                        transform-origin: top;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0.9;
                        transform: scaleY(1);
                        transform-origin: top;
                    }
                }
                
                @keyframes impact-flash {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    30% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1.5);
                    }
                }
                
                @keyframes spark-burst {
                    0% {
                        opacity: 1;
                        transform: rotate(var(--rotation)) translateY(-80px) scaleY(1);
                    }
                    100% {
                        opacity: 0;
                        transform: rotate(var(--rotation)) translateY(-120px) scaleY(0.3);
                    }
                }
                
                @keyframes shockwave {
                    0% {
                        width: 100px;
                        opacity: 0.9;
                    }
                    100% {
                        width: 500px;
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
