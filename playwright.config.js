'use strict';

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'artifacts/html-report', open: 'never' }],
        ['json', { outputFile: 'artifacts/results.json' }]
    ],
    outputDir: 'test-results',
    use: {
        baseURL: 'http://127.0.0.1:4182',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off'
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        }
    ],
    webServer: {
        command: 'node tests/server.js',
        url: 'http://127.0.0.1:4182',
        reuseExistingServer: !process.env.CI,
        timeout: 15000
    }
});
