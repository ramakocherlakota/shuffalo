import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import CycleStorage from '@cycle/storage';

import GridDriver from './GridDriver';

const Rx = require(`rx-dom`)

function startingSquares(n, hflip, vflip) {
    var array = new Array();
    for (var i=0; i<n; i++) {
        array[i] = new Array();
        for (var j=0; j<n; j++) {
            array[i][j] = {row : i, col : j, hflip : false, vflip : false};
        }
    }
    return {cells : array, hflip : hflip, vflip : vflip};
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

function moveFunction(direction, at, by, size, hflip, vflip) {
    return function(squares, i, j) {
        if (direction === 'horz') {
            let delta = modPos(j-by, 2 * size)
            if (hflip) {
                if (delta >= size) {
                    if (i == at || i == size - 1 - at) {
                        return squares[size - 1 - i][delta % size]
                    }
                    else {
                        return squares[i][j]
                    }
                }
                else {
                    if (i == at || i == size - 1 - at) {
                        return squares[i][delta % size]
                    }
                    else {
                        return squares[i][j]
                    }
                }
            }
            else if (i == at) {
                return squares[i][delta % size]
            }
            else {
                return squares[i][j]
            }
        }
        else if (direction === 'vert') {
            let delta = modPos(i-by, 2 * size)
            if (vflip) {
                if (delta >= size) {
                    if (j == at || j == size - 1 - at) {
                        return squares[delta % size][size - 1 - j]
                    }
                    else {
                        return squares[i][j]
                    }
                }
                else {
                    if (j == at || j == size - 1 - at) {
                        return squares[delta % size][j]
                    }
                    else {
                        return squares[i][j]
                    }
                }
            }
            else if (j == at) {
                return squares[delta % size][j]
            }
            else {
                return squares[i][j]
            }
        }
        return squares[i][j]
    }
}

function copyCell(square) {
    return {row : square.row, col: square.col, hflip : square.hflip, vflip : square.vflip}
}

function actOn(squares, move) {
    if (!move.direction) {
        return squares;
    }

    if (move.size != squares.cells.length) {
        return startingSquares(move.size, move.flip > 0, move.flip > 1);
    }

    let moveFn = moveFunction(move.direction, move.at, move.by, move.size, move.flip > 0, move.flip > 1);
    var newCells = new Array();
    for (let i=0; i<move.size; i++) {
        newCells[i] = new Array();
        for (let j=0; j<move.size; j++) {
            newCells[i][j] = copyCell(moveFn(squares.cells, i, j))
        }
    }
    return {cells : newCells, hflip : squares.hflip, vflip : squares.vflip}
}

//function dumpSquare(square) {
//    return "(" + square.row + ", " + square.col + ")"
//}
//
//function dumpSquares(squares) {
//    for (let i=0; i<squares.length; i++) {
//        var line = "";
//        for (let j=0; j<squares.length; j++) {
//            line += dumpSquare(squares[i][j]) + "; "
//        }
//        console.log(line)
//    }
//    console.log("")
//}

function main(sources) {
    const gridDriver = sources.GridDriver;
    const moveDone$ = gridDriver.filter(evt => evt.eventType === "moveDone")


    // TODO unhardcode the image path

    const imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {key : "img", value : file}})
    const sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).startWith("3").map(v => {return {key : "size", value : v}})
    const flipSelect$ = sources.DOM.select("#flip-chooser").events("change").map(ev => ev.target.value).startWith("0").map(v => {return {key : "flip", value : v}})
    const showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {key: "showGrid", value : v}})

    const starting3 = startingSquares(3, false, false)
    const starting$ = Rx.Observable.combineLatest(sizeSelect$, flipSelect$,
                                                  function(s, f) {
                                                      return startingSquares(s.value, f.value > 0, f.value > 1);
                                                  }).startWith(starting3);

    const squares$ = starting$.flatMap(s => moveDone$.scan(actOn, s).startWith(s))

    const redraw$ = Rx.Observable.combineLatest(imgSelect$, showGrid$, squares$,
                                                function(i, sg, squares) {
                                                    return {
                                                        eventType :"redraw", 
                                                        size : squares.cells.length,
                                                        imageFile : i.value,
                                                        flip : (squares.hflip ? 1 : 0) + (squares.vflip ? 1 : 0),
                                                        hflip : squares.hflip,
                                                        vflip : squares.vflip,
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
