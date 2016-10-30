import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver(); // GridDriver returns a function
    let dragger$ = gridDriver.dragger;

    let imgSelect$ = sources.DOM.select("#image-chooser").events("change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {eventType: "img", imageFile : file}})

    let showGrid$ = sources.DOM.select("show-grid-cb").events("change").map(ev => ev.target.checked).startWith(true).map(value => {return {eventType: "showGrid", value}})

    let gridEvent$ = dragger$.merge(imgSelect$).merge(showGrid$)

    return {
	GridDriver: gridEvent$
    };
}

window.onload = function() {
    const drivers = {
        GridDriver: GridDriver.makeGridDriver("#canvas"),
        DOM : CycleDOM.makeDOMDriver('#main-container')
    }

    Cycle.run(main, drivers);
}    
