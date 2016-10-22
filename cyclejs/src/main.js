import Cycle from '@cycle/core';
import GridDriver from './GridDriver';
import EventMapper from './EventMapper';

function main(sources) {
    let gridDriver = sources.GridDriver();
    let dragger$ = gridDriver.dragger;
    let showLines$ = gridDriver.down.map(ev => {return {eventType : "showLines"}});
    let hideLines$ = gridDriver.up.map(ev => {return {eventType : "hideLines"}});

    let gridEvent$ = dragger$.merge(showLines$).merge(hideLines$);

    return {
	GridDriver: gridEvent$
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas")
}

Cycle.run(main, drivers);
