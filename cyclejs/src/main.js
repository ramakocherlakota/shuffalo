import Cycle from '@cycle/core';
import GridDriver from './GridDriver';

function main(sources) {
    let dragger$ = sources.GridDriver().dragger;
    return {
	GridDriver: dragger$.map(ev => ev)
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas")
}

Cycle.run(main, drivers);
