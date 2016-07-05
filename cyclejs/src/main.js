import Cycle from '@cycle/core';
import GridDriver from './GridDriver';

function main(sources) {
    return {
	GridDriver: sources.GridDriver().map(ev => {console.log(ev); return ev;})
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas")
}

Cycle.run(main, drivers);
