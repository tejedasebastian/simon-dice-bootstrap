'use strict';

const $botonEmpezar = document.querySelector('#empezar');
const $estado = document.querySelector('#estado');
const $ronda = document.querySelector('#ronda');
const $cuadros = Array.from(document.querySelectorAll('.cuadro'));

let secuenciaMaquina = [];
let secuenciaUsuario = [];
let ronda = 0;
let jugando = false;
let turnoJugador = false;
let temporizadoresJuego = [];
const temporizadoresResaltado = new WeakMap();

$botonEmpezar.addEventListener('click', comenzarJuego);
$cuadros.forEach(function ($cuadro) {
    $cuadro.addEventListener('click', manejarInputUsuario);
    $cuadro.setAttribute('aria-disabled', 'true');
});

actualizarEstado('Tocá «Empezar» para jugar.');
actualizarNumeroRonda(0);

function comenzarJuego() {
    limpiarTemporizadoresJuego();
    limpiarResaltados();
    reiniciarEstado();
    manejarRonda();
}

function reiniciarEstado() {
    secuenciaMaquina = [];
    secuenciaUsuario = [];
    ronda = 0;
    jugando = true;
    turnoJugador = false;
}

function manejarRonda() {
    turnoJugador = false;
    actualizarEstado('Turno de la máquina');
    bloquearInputUsuario();

    const $nuevoCuadro = obtenerCuadroAleatorio();
    secuenciaMaquina.push($nuevoCuadro);

    secuenciaMaquina.forEach(function ($cuadro, index) {
        programarJuego(function () {
            resaltar($cuadro);
        }, (index + 1) * 1000);
    });

    programarJuego(function () {
        actualizarEstado('Turno del jugador');
        desbloquearInputUsuario();
    }, (secuenciaMaquina.length + 1) * 1000);

    secuenciaUsuario = [];
    ronda += 1;
    actualizarNumeroRonda(ronda);
}

function manejarInputUsuario(e) {
    if (!jugando || !turnoJugador) {
        return;
    }

    const $cuadro = e.currentTarget;
    resaltar($cuadro);
    secuenciaUsuario.push($cuadro);

    const $cuadroMaquina = secuenciaMaquina[secuenciaUsuario.length - 1];
    if (!$cuadroMaquina || $cuadro.id !== $cuadroMaquina.id) {
        perder();
        return;
    }

    if (secuenciaUsuario.length === secuenciaMaquina.length) {
        turnoJugador = false;
        bloquearInputUsuario();
        programarJuego(manejarRonda, 1000);
    }
}

function obtenerCuadroAleatorio() {
    const indice = Math.floor(Math.random() * $cuadros.length);
    return $cuadros[indice];
}

function actualizarNumeroRonda(numeroRonda) {
    $ronda.textContent = numeroRonda;
}

function actualizarEstado(estado, error = false) {
    $estado.textContent = estado;
    $estado.classList.toggle('alert-danger', error);
    $estado.classList.toggle('alert-primary', !error);
}

function resaltar($cuadro) {
    if (!$cuadro) {
        return;
    }

    const temporizadorAnterior = temporizadoresResaltado.get($cuadro);
    if (temporizadorAnterior) {
        clearTimeout(temporizadorAnterior);
    }

    $cuadro.classList.add('resaltado');

    const temporizador = setTimeout(function () {
        $cuadro.classList.remove('resaltado');
        temporizadoresResaltado.delete($cuadro);
    }, 500);

    temporizadoresResaltado.set($cuadro, temporizador);
}

function bloquearInputUsuario() {
    turnoJugador = false;
    $cuadros.forEach(function ($cuadro) {
        $cuadro.classList.remove('habilitado');
        $cuadro.setAttribute('aria-disabled', 'true');
    });
}

function desbloquearInputUsuario() {
    turnoJugador = true;
    $cuadros.forEach(function ($cuadro) {
        $cuadro.classList.add('habilitado');
        $cuadro.setAttribute('aria-disabled', 'false');
    });
}

function perder() {
    jugando = false;
    limpiarTemporizadoresJuego();
    bloquearInputUsuario();
    actualizarEstado('¡Perdiste! Tocá «Empezar» para jugar de nuevo.', true);
}

function programarJuego(fn, milisegundos) {
    const temporizador = setTimeout(function () {
        temporizadoresJuego = temporizadoresJuego.filter(function (id) {
            return id !== temporizador;
        });
        fn();
    }, milisegundos);

    temporizadoresJuego.push(temporizador);
}

function limpiarTemporizadoresJuego() {
    temporizadoresJuego.forEach(clearTimeout);
    temporizadoresJuego = [];
}

function limpiarResaltados() {
    $cuadros.forEach(function ($cuadro) {
        const temporizador = temporizadoresResaltado.get($cuadro);
        if (temporizador) {
            clearTimeout(temporizador);
            temporizadoresResaltado.delete($cuadro);
        }
        $cuadro.classList.remove('resaltado');
    });
}
