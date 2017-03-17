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
    return {cells : array, hflip : hflip, vflip : vflip, stored : false};
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

function actOn(squares, event) {
    if (event.eventType === "reset") {
        return startingSquares(squares.cells.length, squares.hflip, squares.vflip);
    }

    if (event.eventType === "size") {
        return startingSquares(event.value, squares.hflip, squares.vflip);
    }

    if (event.eventType === "flip") {
        return startingSquares(squares.cells.length, event.value > 0, event.value > 1);
    }

    // must be a moveDone
    
    if (!event.direction) {
        return squares;
    }

    if (event.size != squares.cells.length) {
        return startingSquares(event.size, event.flip > 0, event.flip > 1);
    }

    let moveFn = moveFunction(event.direction, event.at, event.by, event.size, event.flip > 0, event.flip > 1);
    var newCells = new Array();
    for (let i=0; i<event.size; i++) {
        newCells[i] = new Array();
        for (let j=0; j<event.size; j++) {
            newCells[i][j] = copyCell(moveFn(squares.cells, i, j))
        }
    }
    return {cells : newCells, hflip : squares.hflip, vflip : squares.vflip, stored : false}
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
    const fromStorage$ = fromStorage(localStorage)

    const gridDriver = sources.GridDriver;
    const moveDone$ = gridDriver.filter(evt => evt.eventType === "moveDone")

    // TODO unhardcode the image path

    const imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).map(file => {return {key : "img", value : file, stored : false}})
    const imgStore$ = fromStorage$.stored.map(s => {return {key : "img", value : s.img, stored : true}});
    const img$ = imgStore$.merge(imgSelect$)

    const showGridSelect$ = sources.DOM.select("#showGrid-chooser").events("change").map(ev => ev.target.value).map(v => {return {key : "showGrid", value : v, stored : false}})
    const showGridStore$ = fromStorage$.stored.map(s => {return {key : "showGrid", value : s.showGrid, stored : true}});
    const showGrid$ = showGridStore$.merge(showGridSelect$)

    const starting$ = fromStorage$.stored.map(function(s) {
                                            return {
                                                cells : s.squares.cells,
                                                hflip: s.squares.hflip,
                                                vflip : s.squares.vflip,
                                                size : s.squares.cells.length,
                                                stored : true
                                            }
    })

    const flipSelect$ = sources.DOM.select("#flip-chooser").events("change").map(ev => ev.target.value).map(val => {return {eventType : "flip", value : val}})

    const sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).map(val => {return {eventType : "size", value : val}})

    const reset$ = sources.DOM.select("#reset").events("click").map(v => {return {eventType : "reset"}})

    const squares$ = starting$.first().flatMap(s => moveDone$
                                               .merge(reset$)
                                               .merge(sizeSelect$)
                                               .merge(flipSelect$)
                                               .scan(actOn, s).startWith(s))


    const redraw$ = Rx.Observable.combineLatest(img$, showGrid$, squares$, 
                                                function(i, sg, squares) {
                                                    return {
                                                        eventType :"redraw", 
                                                        canvasId : "canvas",
                                                        size : squares.cells.length || 3,
                                                        imageFile : i.value,
                                                        flip : (squares.hflip ? 1 : 0) + (squares.vflip ? 1 : 0),
                                                        hflip : squares.hflip,
                                                        vflip : squares.vflip,
                                                        showGrid : sg.value || "on-press",
                                                        squares : squares
                                                    }
                                                });


    const squaresStorage$ = squares$
          .map(sq => {return { key : "squares", value : JSON.stringify(sq), stored : sq.stored}})

    const toStorage$ = img$.filter(unstored)
        .merge(showGrid$.filter(unstored))
        .merge(squaresStorage$.filter(unstored))

//    toStorage$.subscribe(printMe("toStorage"));

    return {
        DOM : fromStorage$.DOM,
        storage : toStorage$,
	GridDriver : redraw$
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

function fromStorage(localStorage) {
    const storedImg$ = localStorage.getItem("img")
    const storedShowGrid$ = localStorage.getItem("showGrid")
    const storedSquares$ = localStorage.getItem("squares")

    const stored$ = Rx.Observable.combineLatest(storedImg$, storedShowGrid$, storedSquares$,
                                                function(i, sg, sq) {
                                                    return {
                                                        img : i || "bison.jpg",
                                                        showGrid : sg || "on-press",
                                                        squares : (sq && JSON.parse(sq)) || startingSquares(3, false, false)
                                                    };
                                                });
    

    const jpgs = Array({value : 'bison.jpg', label : 'Bison'},
                       {value : 'candyshop.jpg', label : 'Candy Shop'},
                       {value : 'carousel.jpg', label : 'Carousel'},
                       {value : 'clematis.jpg', label : 'Clematis'},
                       {value : 'epices.jpg', label : 'Spices'},
                       {value : 'freycinet.jpg', label : 'Freycinet'},
                       {value : 'hands_with_shells.jpg', label : 'Shells'},
                       {value : 'jellyfish.jpg', label : 'Jellyfish'},
                       {value : 'log_and_fungi.jpg', label : 'Log'},
                       {value : 'puppy_and_dog.jpg', label : 'Dogs'},
                       {value : 'tidepool.jpg', label : 'Tidepool'});
    
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
                    h('select', {id : "image-chooser"}, jpgs.map(jpg => h('option', {selected : jpg.value === s.img, value : jpg.value}, 
                                                                          jpg.label))),
                   ]),
            h('p', [h('label', {for: "showGrid-chooser"}, "Grid"),
                    h('select', {id : "showGrid-chooser"}, grids.map(grid => h('option', {selected : grid.value === s.showGrid, value : grid.value}, grid.label))),
                   ]),
            h('p', [h('label', {for: "size-chooser"}, "Size"),
                    h('select', {id : "size-chooser"}, sizes.map(size => h('option', {selected : size.value ==  s.squares.cells.length, value : size.value}, size.label))),
                   ]),
            h('p', [h('label', {for: "flip-chooser"}, "Flip"),
                    h('select', {id : "flip-chooser"}, flips.map(flip => h('option', {selected : flip.value == (s.squares.hflip + s.squares.vflip), value : flip.value}, flip.label))),
                   ]),
            h('p', h('a', {id : "reset", href : "#"}, "Reset"))])
    });
            
    return {DOM : dom$,
            stored : stored$}
}


function unstored(x) {
    return !x.stored;
}

function printMe(name) {
    return function(x) {
        console.log("printing " + name)
        console.log(x)
    }
}

var counts = {};
function logCount(name) {
    return function() {
        if (!counts[name]) {
            counts[name] = 0;
        }
        console.log(name +  " : " + counts[name]++)
    }
}
