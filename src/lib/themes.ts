export type ThemeLayout = 'classic' | 'bento';

export interface Theme {
    id: string;
    layout: ThemeLayout;
    name: string;
    description: string;
    variables: Record<string, string>; // Common variables
    lightVariables?: Record<string, string>; // Light mode overrides
    darkVariables?: Record<string, string>; // Dark mode overrides
}

export const THEMES: Theme[] = [
    {
        id: 'standard',
        name: 'RestDock Standard',
        layout: 'bento',
        description: 'Modern rust accent with dark slate theme.',
        variables: {
            '--primary': '15 90% 50%', // Rust/Burnt Orange (more red than Postman)
            '--primary-foreground': '0 0% 98%',
            '--radius': '0.5rem',
            '--ring': '15 90% 50%',
        },
        lightVariables: {
            '--background': '0 0% 100%',
            '--foreground': '222 15% 10%',
            '--card': '0 0% 100%',
            '--card-foreground': '222 15% 10%',
            '--popover': '0 0% 100%',
            '--popover-foreground': '222 15% 10%',
            '--muted': '220 14% 96%',
            '--muted-foreground': '220 8% 46%',
            '--border': '220 13% 91%',
            '--input': '220 13% 91%',
            '--app-bg': 'radial-gradient(circle at 50% -20%, #fef3f0 0%, #fff 40%, transparent 100%)',
        },
        darkVariables: {
            '--background': '220 18% 12%',
            '--foreground': '210 40% 98%',
            '--card': '220 18% 16%',
            '--card-foreground': '210 40% 98%',
            '--popover': '220 18% 14%',
            '--popover-foreground': '210 40% 98%',
            '--secondary': '15 35% 18%',
            '--secondary-foreground': '15 90% 95%',
            '--muted': '217 20% 18%',
            '--muted-foreground': '215 20% 65%',
            '--accent': '15 50% 20%',
            '--accent-foreground': '15 90% 95%',
            '--border': '217 10% 20%',
            '--input': '217 15% 18%',
            // Rust-colored orbs
            '--app-bg': 'radial-gradient(circle 200px at 30% 40%, hsl(15 90% 50% / 0.2) 0%, transparent 100%), radial-gradient(circle 250px at 75% 30%, hsl(12 85% 45% / 0.15) 0%, transparent 100%), radial-gradient(circle 180px at 50% 75%, hsl(18 90% 48% / 0.12) 0%, transparent 100%), radial-gradient(circle 150px at 15% 70%, hsl(15 80% 52% / 0.1) 0%, transparent 100%), radial-gradient(circle 220px at 85% 65%, hsl(10 85% 45% / 0.1) 0%, transparent 100%), radial-gradient(ellipse 100% 60% at 50% -20%, hsl(15 95% 48% / 0.3) 0%, transparent 60%)',
            '--app-bg-size': '100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
        }
    }
];

// Collect all unique keys used across all themes to ensure proper cleanup
export const ALL_THEME_KEYS = Array.from(
    new Set(
        THEMES.flatMap(theme => [
            ...Object.keys(theme.variables),
            ...(theme.lightVariables ? Object.keys(theme.lightVariables) : []),
            ...(theme.darkVariables ? Object.keys(theme.darkVariables) : [])
        ])
    )
);
