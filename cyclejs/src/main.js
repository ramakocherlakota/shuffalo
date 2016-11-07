import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver;
    let moveDone$ = gridDriver.moveDone;

    moveDone$.subscribe(evt => console.log("moveDone: " + evt.direction + " at " + evt.at + " by " + evt.by))

    // TODO unhardcode the image path
    let imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {eventType: "img", imageFile : file}})

    let showGrid$ = sources.DOM.select("#grid-chooser").events("change").map(ev => ev.target.value).startWith("on-press").map(v => {return {eventType: "showGrid", value: v}})

    let configChange$ = imgSelect$.merge(showGrid$)

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
