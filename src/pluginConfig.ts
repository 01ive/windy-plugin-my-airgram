import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-my-airgram',
    version: '0.0.1',
    icon: '🦅',
    title: 'Airgram for humans',
    description: 'Airgram to prepare flight plans.',
    author: '01ive',
    repository: 'https://github.com/01ive/windy-plugin-my-airgram',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/my-plugin',
    private: true,
};

export default config;
