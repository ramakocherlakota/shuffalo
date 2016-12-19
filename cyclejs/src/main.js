import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver;
    let moveDone$ = gridDriver.filter(evt => evt.eventType === "moveDone")

    moveDone$.subscribe(evt => console.log("moveDone: " + evt.direction + " at " + evt.at + " by " + evt.by))

    // TODO unhardcode the image path
    let imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {imageFile : file}})
    let sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).startWith("3").map(v => {return {size: v}})
    let flipSelect$ = sources.DOM.select("#flip-chooser").events("change").map(ev => ev.target.value).startWith("0").map(v => {return {flip: v}})
    let showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {showGrid: v}})

    let redraw$ = Rx.Observable.combineLatest(imgSelect$, sizeSelect$, flipSelect$, showGrid$,
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
