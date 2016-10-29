import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver();
    let dragger$ = gridDriver.dragger;

    let imageChooser = document.getElementById("image-chooser")

    let imgSelect$ = Rx.Observable.fromEvent(imageChooser, "change").map(ev => ev.target.value).startWith("bison.jpg").map(fname => "file:///Users/rama/work/shuffalo/cyclejs/img/large/" + fname).map(file => {return {eventType: "img", imageFile : file}})

    let gridEvent$ = dragger$.merge(imgSelect$)

    return {
	GridDriver: gridEvent$
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas"),
    DOM : CycleDOM.makeDOMDriver('#main-container')
}

window.onload = function() {
    Cycle.run(main, drivers);
}    
