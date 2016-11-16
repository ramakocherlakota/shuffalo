import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver;
    let moveDone$ = gridDriver.moveDone;

    moveDone$.subscribe(evt => console.log("moveDone: " + evt.direction + " at " + evt.at + " by " + evt.by))

    // TODO unhardcode the image path
    let imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {imageFile : file}})
    let sizeSelect$ = sources.DOM.select("#size-chooser").events("change").map(ev => ev.target.value).startWith("3").map(v => {return {size: v}})
    let redraw$ = Rx.Observable.combineLatest(imgSelect$, sizeSelect$, 
                                              function(i, s) {
                                                  return {
                                                      eventType :"redraw", 
                                                      size : s.size, 
                                                      imageFile : i.imageFile
                                                  }
                                              });

    let showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {eventType: "showGrid", gridValue: v}})

    let configChange$ = showGrid$.merge(redraw$);

    configChange$.subscribe(evt => console.log(evt));

    return {
	GridDriver: configChange$
    };
}

window.onload = function() {
    const drivers = {
        GridDriver: GridDriver.makeGridDriver("#canvas"),
        DOM : CycleDOM.makeDOMDriver('#main-container')
    }

    Cycle.run(main, drivers);
}    
