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
        name: 'Rust (Brand)',
        layout: 'bento',
        description: 'Hyper-immersive Forge design.',
        variables: {
            '--primary': '24.6 95% 53.1%', // Super bright orange
            '--primary-foreground': '60 9.1% 97.8%',
            '--ring': '24.6 95% 53.1%',
            '--radius': '0.75rem',
        },
        lightVariables: {
            // "Forge Day": Soft warm orange glow
            '--app-bg': 'radial-gradient(circle at 50% -20%, #ffedd5 0%, #fff7ed 40%, rgba(255,255,255,0) 100%)',
            // Light colors
            '--background': '0 0% 100%',
            '--foreground': '20 14.3% 4.1%',
            '--card': '0 0% 100%', // Use full white or slightly tinted? Full white for clean look.
            '--card-foreground': '20 14.3% 4.1%',
            '--popover': '0 0% 100%',
            '--popover-foreground': '20 14.3% 4.1%',
            '--muted': '24 5.7% 92.9%', // Light warm gray
            '--muted-foreground': '24 5.4% 53.9%',
            '--border': '20 5.9% 90%',
            '--input': '20 5.9% 90%',
        },
        darkVariables: {
            // "Forge Night": Molten
            '--app-bg': 'radial-gradient(circle at 50% -20%, #ff6b35 0%, #c2410c 25%, #431407 50%, #0c0a09 100%)',
            // Dark colors (Original overrides)
            '--background': '20 14% 4%',
            '--foreground': '35 25% 96%',
            '--card': '20 14% 8%',
            '--card-foreground': '35 25% 96%',
            '--popover': '20 14% 6%',
            '--popover-foreground': '35 25% 96%',
            '--secondary': '14 30% 12%',
            '--secondary-foreground': '35 25% 96%',
            '--muted': '14 30% 12%',
            '--muted-foreground': '24 10% 70%',
            '--accent': '14 40% 20%',
            '--accent-foreground': '35 25% 96%',
            '--destructive': '0 62.8% 30.6%',
            '--destructive-foreground': '35 25% 96%',
            '--border': '20.6 30% 30%',
            '--input': '20 20% 15%',
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
