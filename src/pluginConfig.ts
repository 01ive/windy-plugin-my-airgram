import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-my-airgram',
    version: '0.0.2',
    icon: '🦅',
    title: 'Airgram for humans',
    description: 'Airgram to easily flight plans.',
    author: '01ive',
    repository: 'https://github.com/01ive/windy-plugin-my-airgram',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/my-plugin',
    private: true,
};

export default config;
