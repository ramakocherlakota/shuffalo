import Cycle from '@cycle/core';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver();
    let dragger$ = gridDriver.dragger;
    let showLines$ = gridDriver.down.map(ev => {return {eventType : "showLines"}});
    let hideLines$ = gridDriver.up.map(ev => {return {eventType : "hideLines"}});
    let img$ = Rx.Observable.of({eventType : "img"});

    let gridEvent$ = showLines$.merge(hideLines$).merge(dragger$).merge(img$);

    return {
	GridDriver: gridEvent$
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas")
}

Cycle.run(main, drivers);
