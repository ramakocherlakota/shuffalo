import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import storageDriver from '@cycle/storage';
const h = CycleDOM.h;
const Rx = require(`rx-dom`)

import GridDriver from './GridDriver';


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
                        return {square : squares[size - 1 - i][delta % size], hflip : true}
                    }
                    else {
                        return {square : squares[i][j]}
                    }
                }
                else {
                    if (i == at || i == size - 1 - at) {
                        return {square : squares[i][delta % size]}
                    }
                    else {
                        return {square : squares[i][j]}
                    }
                }
            }
            else if (i == at) {
                return {square : squares[i][delta % size]}
            }
            else {
                return {square : squares[i][j]}
            }
        }
        else if (direction === 'vert') {
            let delta = modPos(i-by, 2 * size)
            if (vflip) {
                if (delta >= size) {
                    if (j == at || j == size - 1 - at) {
                        return {square : squares[delta % size][size - 1 - j], vflip : true}
                    }
                    else {
                        return {square : squares[i][j]}
                    }
                }
                else {
                    if (j == at || j == size - 1 - at) {
                        return {square : squares[delta % size][j]}
                    }
                    else {
                        return {square : squares[i][j]}
                    }
                }
            }
            else if (j == at) {
                return {square : squares[delta % size][j]}
            }
            else {
                return {square : squares[i][j]}
            }
        }
        return {square : squares[i][j]}
    }
}

function toggleIf(base, flag) {
    if (flag) {
        return ! base
    }
    else {
        return base;
    }
}

function copyCell(cell) {
    return {row : cell.square.row, col: cell.square.col, hflip : toggleIf(cell.square.hflip, cell.hflip), vflip : toggleIf(cell.square.vflip, cell.vflip)}
}

function actOn(squares, move) {
    if (move === "reset") {
        return startingSquares(squares.cells.length, squares.hflip, squares.vflip);
    }

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
    const localStorage = sources.storage.local;
    const gridDriver = sources.GridDriver;
    const moveDone$ = gridDriver.filter(evt => evt.eventType === "moveDone")

    // TODO unhardcode the image path

    const imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).map(file => {return {key : "img", value : file}})

    const imgStore$ = localStorage.getItem("img").map(file => {return {key : "img", value : file}})

    const img$ = imgStore$.merge(imgSelect$)

    const sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).startWith("3").map(v => {return {key : "size", value : v}})
    const flipSelect$ = sources.DOM.select("#flip-chooser").events("change").map(ev => ev.target.value).startWith("0").map(v => {return {key : "flip", value : v}})
    const showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {key: "showGrid", value : v}})

    const reset$ = sources.DOM.select("#reset").events("click").map(v => {return "reset"})


    const starting3 = startingSquares(3, false, false)
    const starting$ = Rx.Observable.combineLatest(sizeSelect$, flipSelect$,
                                                  function(s, f) {
                                                      return startingSquares(s.value, f.value > 0, f.value > 1);
                                                  }).startWith(starting3);


    const squares$ = starting$.flatMap(s => moveDone$.merge(reset$).scan(actOn, s).startWith(s))

    const redraw$ = Rx.Observable.combineLatest(img$, showGrid$, squares$, 
                                                function(i, sg, squares) {
                                                    return {
                                                        eventType :"redraw", 
                                                        canvasId : "canvas",
                                                        size : squares.cells.length,
                                                        imageFile : i.value,
                                                        flip : (squares.hflip ? 1 : 0) + (squares.vflip ? 1 : 0),
                                                        hflip : squares.hflip,
                                                        vflip : squares.vflip,
                                                        showGrid : sg.value,
                                                        squares : squares
                                                    }
                                                });

    const squaresStorage$ = squares$.map(sq => {return {key : "squares", value : JSON.stringify(sq.cells)}});

    const toStorage$ = imgSelect$.merge(sizeSelect$).merge(flipSelect$).merge(showGrid$).merge(squaresStorage$);


    return {
        DOM : domFromStorage(localStorage),
	GridDriver : redraw$,
        storage : toStorage$
    };
}

window.onload = function() { 

   const drivers = {
        GridDriver : GridDriver.makeGridDriver("#canvas"),
        DOM : CycleDOM.makeDOMDriver('#main-container'),
        storage : storageDriver
   }

    Cycle.run(main, drivers);
}    

function domFromStorage(localStorage) {
    const storedFlip$ = localStorage.getItem("flip").startWith(0);
    const storedImg$ = localStorage.getItem("img");
    const storedShowGrid$ = localStorage.getItem("showGrid").startWith("on-press");
    const storedSize$ = localStorage.getItem("size").startWith(3);
    const storedSquares$ = localStorage.getItem("squares").startWith(startingSquares(3, false, false));

    const stored$ = Rx.Observable.combineLatest(storedFlip$, storedImg$, storedShowGrid$, storedSize$, storedSquares$,
                                                function(f, i, sg, sz, sq) {
                                                    return {
                                                        flip : f,
                                                        img : i,
                                                        showGrid : sg,
                                                        size : sz,
                                                        squares : sq
                                                    };
                                                });
    


    const jpgs = Array('bison.jpg', 'candyshop.jpg', 'carousel.jpg', 'clematis.jpg', 'epices.jpg', 'freycinet.jpg', 'hands_with_shells.jpg', 'jellyfish.jpg', 'log_and_fungi.jpg', 'puppy_and_dog.jpg', 'tidepool.jpg')
    
    const grids = Array({value : "on-press", label: "On Press"},
                        {value : "never", label: "Never"},
                        {value : "always", label: "Always"});
    
    const sizes = Array({value : "3", label: "3 x 3"},
                        {value : "4", label: "4 x 4"},
                        {value : "5", label: "5 x 5"});
    
    const flips = Array({value : "0", label: "None"},
                        {value : "1", label: "One"},
                        {value : "2", label: "Two"});

   
    const dom$ = stored$.map(s => {
        return h('div', [
            h('p', [h('label', {for : "image-chooser"}, "Image"),
                    h('select', {id : "image-chooser"}, jpgs.map(jpg => h('option', {selected : jpg === s.img}, 
                                                                          jpg))),
                   ]),
            h('p', [h('label', {for: "grid-chooser"}, "Grid"),
                    h('select', {id : "grid-chooser"}, grids.map(grid => h('option', {value : grid.value}, grid.label))),
                   ]),
            h('p', [h('label', {for: "size-chooser"}, "Size"),
                    h('select', {id : "size-chooser"}, sizes.map(size => h('option', {value : size.value}, size.label))),
                   ]),
            h('p', [h('label', {for: "flip-chooser"}, "Flip"),
                    h('select', {id : "flip-chooser"}, flips.map(flip => h('option', {value : flip.value}, flip.label))),
                   ]),
            h('p', h('a', {id : "reset", href : "#"}, "Reset"))])
    });
            
    return dom$;
}
