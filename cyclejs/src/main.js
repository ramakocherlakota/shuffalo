import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import CycleStorage from '@cycle/storage';

import GridDriver from './GridDriver';

const Rx = require(`rx-dom`)

function startingSquares(n) {
    var array = new Array();
    for (var i=0; i<n; i++) {
        array[i] = new Array();
        for (var j=0; j<n; j++) {
            array[i][j] = {row : i, col : j};
        }
    }
    return array;
}
    
function modPos(arg, size) {
    if (!size || size <= 0) {
        console.log("must provide a positive second argument to modPos!")
        return arg;
    }
    if (arg < 0) {
        arg += Math.abs(Math.floor(arg / size)) * size
    }
    return arg % size;
}

function moveFunction(direction, at, by, size) {
    return function(squares, i, j) {
        if (direction === 'horz') {
            if (i == at) {
                return squares[i][modPos(j-by, size)]
            }
        }
        else if (direction === 'vert') {
            if (j == at) {
                return squares[modPos(i-by, size)][j]
            }
        }
        return squares[i][j]
    }
}

function copySquare(square) {
    return {row : square.row, col: square.col}
}

function actOn(squares, move) {
    if (!move.direction) {
        return squares;
    }

    let moveFn = moveFunction(move.direction, move.at, move.by, move.size)
    var newSquares = new Array();
    for (let i=0; i<move.size; i++) {
        newSquares[i] = new Array();
        for (let j=0; j<move.size; j++) {
            newSquares[i][j] = copySquare(moveFn(squares, i, j))
        }
    }
    return newSquares
}

function dumpSquare(square) {
    return "(" + square.row + ", " + square.col + ")"
}

function dumpSquares(squares) {
    for (let i=0; i<squares.length; i++) {
        var line = "";
        for (let j=0; j<squares.length; j++) {
            line += dumpSquare(squares[i][j]) + "; "
        }
        console.log(line)
    }
    console.log("")
}

function main(sources) {
    const gridDriver = sources.GridDriver;
    const moveDone$ = gridDriver.filter(evt => evt.eventType === "moveDone")


    // TODO unhardcode the image path

    const imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {key : "img", value : file}})
    const sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).startWith("3").map(v => {return {key : "size", value : v}})
    const flipSelect$ = sources.DOM.select("#flip-chooser").events("change").map(ev => ev.target.value).startWith("0").map(v => {return {key : "flip", value : v}})
    const showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {key: "showGrid", value : v}})
    sizeSelect$.subscribe(console.log)

    // TODO unhardcode puzzle size - load it from storage, also subscribe to sizeSelect$
    const starting3 = startingSquares(3)
    const starting$ = sizeSelect$.pluck("value").map(startingSquares).startWith(starting3);
//    starting$.subscribe(dumpSquares)

    const squares$ = starting$.flatMap(s => moveDone$.scan(actOn, s)
    squares$.subscribe(dumpSquares)

    const redraw$ = Rx.Observable.combineLatest(imgSelect$, flipSelect$, showGrid$, squares$,
                                                function(i, f, sg, squares) {
                                                    return {
                                                        eventType :"redraw", 
                                                        size : squares.length,
                                                        imageFile : i.value,
                                                        flip : f.value,
                                                        showGrid : sg.value,
                                                        squares : squares
                                                    }
                                                });

    const storage$ = Rx.Observable.combineLatest(imgSelect$, sizeSelect$, flipSelect$, showGrid$, squares$);

    return {
	GridDriver : redraw$,
//        Storage : storage$
    };
}

window.onload = function() {
    const drivers = {
        GridDriver : GridDriver.makeGridDriver("#canvas"),
        DOM : CycleDOM.makeDOMDriver('#main-container'),
//        Storage : CycleStorage
    }

    Cycle.run(main, drivers);
}    
