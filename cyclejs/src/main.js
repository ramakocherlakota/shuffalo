import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
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
    
function moveFunction(direction, at, by) {
    return function(squares, i, j) {
        if (direction === 'horz') {
            if (i == at) {
                return squares[i][j-by]
            }
        }
        else {
            if (j == at) {
                return squares[i-by][j]
            }
        }
        return squares[i][j]
    }
}


function actOn(squares, move) {
    const direction = move.direction
    const by = move.by
    const at = move.at
    const size = move.size
    const moveFn = moveFunction(direction, at, by)
    var newSquares = new Array();
    for (let i=0; i<size; i++) {
        newSquares[i] = new Array();
        for (let j=0; j<size; j++) {
            newSquares[i][j] = moveFn(squares, i, j)
        }
    }
    return newSquares
}

function main(sources) {
    const gridDriver = sources.GridDriver;
    const moveDone$ = gridDriver.filter(evt => evt.eventType === "moveDone")

//    moveDone$.subscribe(evt => console.log("moveDone: " + evt.direction + " at " + evt.at + " by " + evt.by))

    const starting = startingSquares(3);
    const squares$ = moveDone$.scan(actOn, starting);

    squares$.subscribe(sq => {
        console.log(sq[0])
        console.log(sq[1])
        console.log(sq[2])
    })

    // TODO unhardcode the image path
    const imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {imageFile : file}})
    const sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).startWith("3").map(v => {return {size: v}})
    const flipSelect$ = sources.DOM.select("#flip-chooser").events("change").map(ev => ev.target.value).startWith("0").map(v => {return {flip: v}})
    const showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {showGrid: v}})

    const redraw$ = Rx.Observable.combineLatest(imgSelect$, sizeSelect$, flipSelect$, showGrid$,
                                              function(i, s, f, sg) {
                                                  return {
                                                      eventType :"redraw", 
                                                      size : s.size, 
                                                      imageFile : i.imageFile,
                                                      flip : f.flip,
                                                      showGrid : sg.showGrid
                                                  }
                                              });

    return {
	GridDriver: redraw$
    };
}

window.onload = function() {
    const drivers = {
        GridDriver: GridDriver.makeGridDriver("#canvas"),
        DOM : CycleDOM.makeDOMDriver('#main-container')
    }

    Cycle.run(main, drivers);
}    
