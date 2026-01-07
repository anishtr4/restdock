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
        id: 'modern',
        name: 'Modern (Bento)',
        layout: 'bento',
        description: 'Floating glass cards, spacious, modern.',
        variables: {
            '--primary': '263.4 70% 60%', // Lighter indigo for better contrast
            '--primary-foreground': '210 40% 98%',
            '--radius': '0.75rem',
            '--ring': '263.4 70% 50.4%',
        },
        lightVariables: {
            // "Aurora Day" Background: Soft violent/indigo bloom on white
            '--app-bg': 'radial-gradient(circle at 10% 10%, #f3e8ff 0%, transparent 40%), radial-gradient(circle at 90% 10%, #e0e7ff 0%, transparent 40%)',
        },
        darkVariables: {
            // "Aurora Night" Background: Deep violet with soft top-left and top-right glows
            '--app-bg': 'radial-gradient(circle at 10% 10%, #2e1065 0%, transparent 40%), radial-gradient(circle at 90% 10%, #4c1d95 0%, transparent 40%)',
        }
    },
    {
        id: 'professional',
        name: 'Professional',
        layout: 'classic',
        description: 'The standard, clean workspace.',
        variables: {
            '--primary': '240 5.9% 10%', // Zinc
            '--primary-foreground': '0 0% 98%',
            '--radius': '0.5rem',
            '--ring': '240 5.9% 10%',
            // Clear any overrides
            '--app-bg': 'none',
        },
        // We can optionally explicitly force standard colors here if we wanted, 
        // but removing them lets Shadcn defaults take over, which is fine.
        lightVariables: {
            '--background': '0 0% 100%',
            '--foreground': '240 10% 3.9%',
            '--muted': '240 4.8% 95.9%',
            '--muted-foreground': '240 3.8% 46.1%',
            '--border': '240 5.9% 90%',
        },
        darkVariables: {
            // Standard ShadCN Defaults for Dark
            '--background': '240 10% 3.9%',
            '--foreground': '0 0% 98%',
            '--card': '240 10% 3.9%',
            '--card-foreground': '0 0% 98%',
            '--muted': '240 3.7% 15.9%',
            '--muted-foreground': '240 5% 64.9%',
        }
    },
    {
        id: 'rust',
        name: 'Rustic (Oxide)',
        layout: 'bento',
        description: 'Deep crimson oxide, weathered and robust.',
        variables: {
            '--primary': '0 72% 51%', // Deep Crimson Red
            '--primary-foreground': '0 0% 98%',
            '--ring': '0 72% 51%',
            '--radius': '0.75rem',
        },
        lightVariables: {
            // "Oxide Day": Soft warm rose/clay glow
            '--app-bg': 'radial-gradient(circle at 50% -20%, #ffe4e6 0%, #fff1f2 40%, rgba(255,255,255,0) 100%)',
            // Light colors
            '--background': '0 0% 100%',
            '--foreground': '0 0% 3.9%',
            '--card': '0 0% 100%',
            '--card-foreground': '0 0% 3.9%',
            '--popover': '0 0% 100%',
            '--popover-foreground': '0 0% 3.9%',
            '--muted': '0 5% 96%', // Very light warm gray
            '--muted-foreground': '0 5% 45%',
            '--border': '0 5% 90%',
            '--input': '0 5% 90%',
        },
        darkVariables: {
            // "Oxide Night": Deep Crimson / Blood Moon
            '--app-bg': 'radial-gradient(circle at 50% -20%, #9f1239 0%, #881337 25%, #4c0519 50%, #0c0a09 100%)',
            // Dark colors
            '--background': '0 0% 4%',
            '--foreground': '0 10% 98%',
            '--card': '0 0% 6%',
            '--card-foreground': '0 10% 98%',
            '--popover': '0 0% 5%',
            '--popover-foreground': '0 10% 98%',
            '--secondary': '0 30% 12%',
            '--secondary-foreground': '0 0% 98%',
            '--muted': '0 30% 12%',
            '--muted-foreground': '0 10% 70%',
            '--accent': '0 40% 20%',
            '--accent-foreground': '0 0% 98%',
            '--destructive': '0 62.8% 30.6%',
            '--destructive-foreground': '0 0% 98%',
            '--border': '0 30% 20%',
            '--input': '0 30% 15%',
        }
    },
    {
        id: 'terminal',
        name: 'Terminal',
        layout: 'classic',
        description: 'High contrast, sharp corners, hacker vibes.',
        variables: {
            '--primary': '142.1 76.2% 36.3%', // Green
            '--primary-foreground': '355.7 100% 97.3%',
            '--radius': '0rem',
            '--ring': '142.1 76.2% 36.3%',
        },
        darkVariables: {
            '--background': '0 0% 0%',
            '--foreground': '142.1 70.6% 45.3%',
            '--card': '0 0% 3%',
            '--card-foreground': '142.1 70.6% 45.3%',
            '--popover': '0 0% 3%',
            '--popover-foreground': '142.1 70.6% 45.3%',
            '--border': '142.1 76.2% 36.3%',
            '--input': '142.1 76.2% 36.3%',
            '--muted': '0 0% 10%',
            '--muted-foreground': '142.1 60% 45%',
            '--app-bg': 'none',
        },
        lightVariables: {
            // Terminal light mode? Probably just matrix green on white?
            '--background': '0 0% 100%',
            '--foreground': '142.1 76.2% 36.3%',
            '--card': '142.1 76.2% 98%',
            '--card-foreground': '142.1 76.2% 36.3%',
            '--border': '142.1 76.2% 36.3%',
            '--input': '142.1 76.2% 36.3%',
            '--app-bg': 'none',
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
