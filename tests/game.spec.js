'use strict';

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:4182';

// 0.05 -> índice 0 (#cuadro-1). Se repite para que cada ronda y cada
// partida nueva empiecen siempre con el mismo cuadro.
const RANDOM_SEQUENCE = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];

async function abrirJuego(page, viewport) {
    const consoleErrors = [];
    const localFailures = [];

    page.on('console', function (message) {
        if (message.type() === 'error') {
            consoleErrors.push(message.text());
        }
    });
    page.on('pageerror', function (error) {
        consoleErrors.push(error.message);
    });
    page.on('response', function (response) {
        if (response.url().startsWith(BASE_URL) && response.status() >= 400) {
            localFailures.push(response.status() + ' ' + response.url());
        }
    });

    if (viewport) {
        await page.setViewportSize(viewport);
    }

    await page.addInitScript(function (sequence) {
        let indice = 0;
        Math.random = function () {
            const valor = sequence[indice % sequence.length];
            indice += 1;
            return valor;
        };
    }, RANDOM_SEQUENCE);

    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(function () {
        return document.fonts.ready;
    });

    return { consoleErrors: consoleErrors, localFailures: localFailures };
}

async function esperarTurnoJugador(page) {
    await expect(page.locator('#estado')).toHaveText('Turno del jugador', { timeout: 6000 });
}

test('flujo completo: ronda 1, ronda 2, derrota y reinicio', async ({ page }) => {
    const errores = await abrirJuego(page);

    await expect(page.locator('#ronda')).toHaveText('0');
    await expect(page.locator('#estado')).toContainText('Empezar');
    await expect(page.locator('#empezar')).toBeEnabled();

    await page.locator('#empezar').click();
    await expect(page.locator('#ronda')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');
    await expect(page.locator('#cuadro-1')).toHaveAttribute('aria-disabled', 'true');

    await esperarTurnoJugador(page);
    await expect(page.locator('#cuadro-1')).toHaveAttribute('aria-disabled', 'false');

    await page.locator('#cuadro-1').click();
    await expect(page.locator('#ronda')).toHaveText('2');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');

    await esperarTurnoJugador(page);
    await page.locator('#cuadro-2').click();

    await expect(page.locator('#estado')).toContainText('Perdiste');
    await expect(page.locator('#estado')).toHaveClass(/alert-danger/);
    await expect(page.locator('#ronda')).toHaveText('2');
    await expect(page.locator('#cuadro-1')).toHaveAttribute('aria-disabled', 'true');

    await page.locator('#cuadro-1').click();
    await expect(page.locator('#estado')).toContainText('Perdiste');

    await page.locator('#empezar').click();
    await expect(page.locator('#ronda')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');
    await expect(page.locator('#estado')).toHaveClass(/alert-primary/);

    await esperarTurnoJugador(page);
    await page.locator('#cuadro-1').click();
    await expect(page.locator('#ronda')).toHaveText('2');

    expect(errores.localFailures).toEqual([]);
    expect(errores.consoleErrors).toEqual([]);
});

test('bloquea el tablero durante el turno de la máquina', async ({ page }) => {
    const errores = await abrirJuego(page);

    await page.locator('#empezar').click();
    await page.locator('#cuadro-1').click();

    await expect(page.locator('#ronda')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');

    await esperarTurnoJugador(page);
    await expect(page.locator('#cuadro-1')).toHaveAttribute('aria-disabled', 'false');

    expect(errores.localFailures).toEqual([]);
    expect(errores.consoleErrors).toEqual([]);
});

test('reiniciar durante la secuencia cancela los timers anteriores', async ({ page }) => {
    const errores = await abrirJuego(page);

    await page.locator('#empezar').click();
    await page.waitForTimeout(1200);
    await page.locator('#empezar').click();

    await expect(page.locator('#ronda')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');

    // A esta altura el temporizador de la partida anterior ya habría
    // desbloqueado el tablero si no se hubiera cancelado.
    await page.waitForTimeout(1200);
    await page.locator('#cuadro-1').click();
    await expect(page.locator('#ronda')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');

    await esperarTurnoJugador(page);
    await page.locator('#cuadro-1').click();
    await expect(page.locator('#ronda')).toHaveText('2');

    expect(errores.localFailures).toEqual([]);
    expect(errores.consoleErrors).toEqual([]);
});

test('doble click en Empezar no desordena la partida', async ({ page }) => {
    const errores = await abrirJuego(page);

    await page.locator('#empezar').dblclick();
    await expect(page.locator('#ronda')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveText('Turno de la máquina');

    await esperarTurnoJugador(page);
    await page.locator('#cuadro-1').click();
    await expect(page.locator('#ronda')).toHaveText('2');

    expect(errores.localFailures).toEqual([]);
    expect(errores.consoleErrors).toEqual([]);
});

for (const ancho of [390, 320]) {
    test('móvil ' + ancho + 'px: sin overflow, assets cargados y sin errores', async ({ page }) => {
        const errores = await abrirJuego(page, { width: ancho, height: 844 });

        await expect(page.locator('#estado')).toBeVisible();
        await expect(page.locator('#empezar')).toBeVisible();

        const bootstrapCargado = await page.evaluate(function () {
            const boton = document.querySelector('#empezar');
            const estilos = getComputedStyle(boton);
            return {
                padding: estilos.getPropertyValue('--bs-btn-padding-x').trim(),
                display: estilos.display
            };
        });
        expect(bootstrapCargado.padding).not.toBe('');
        expect(bootstrapCargado.display).toBe('inline-block');

        const recursos = await page.evaluate(function () {
            return performance.getEntriesByType('resource').map(function (entrada) {
                return entrada.name;
            });
        });
        expect(recursos.some(function (url) { return url.endsWith('/main.css'); })).toBe(true);
        expect(recursos.some(function (url) { return url.endsWith('/main.js'); })).toBe(true);
        expect(recursos.some(function (url) {
            return url.includes('bootstrap@5.3.2') && url.endsWith('/bootstrap.min.css');
        })).toBe(true);

        const icono = await page.request.get('/icono.png');
        expect(icono.status()).toBe(200);
        expect(icono.headers()['content-type']).toContain('image/png');

        const overflowInicial = await page.evaluate(function () {
            return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });
        expect(overflowInicial).toBeLessThanOrEqual(0);

        await page.locator('#empezar').click();
        await esperarTurnoJugador(page);
        await page.locator('#cuadro-2').click();
        await expect(page.locator('#estado')).toContainText('Perdiste');

        const overflowPerdiste = await page.evaluate(function () {
            return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });
        expect(overflowPerdiste).toBeLessThanOrEqual(0);

        expect(errores.localFailures).toEqual([]);
        expect(errores.consoleErrors).toEqual([]);
    });
}
