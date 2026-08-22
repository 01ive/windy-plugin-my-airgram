import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-aero-clear',
    version: '0.0.2',
    icon: '🦅',
    title: 'Aero Clear',
    description: 'Airgram and emagram to easily go to fly.',
    author: '01ive',
    repository: 'https://github.com/01ive/windy-plugin-aero-clear.git',
    desktopUI: 'rhpane',
    mobileUI: 'small',
    routerPath: '/aero-clear',
    private: false,
};

export default config;
