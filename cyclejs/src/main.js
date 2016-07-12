import Cycle from '@cycle/core';
import GridDriver from './GridDriver';

function xorify(ev) {
    return {eventType : "xor", 
	    startX : ev.startX, 
	    startY : ev.startY, 
	    x : ev.x, 
	    y : ev.y};
}

function main(sources) {
    return {
	GridDriver: sources.GridDriver()
//	    .map(ev => {console.log(ev); return ev;})
	    .filter(ev => ev.eventType === "up")
	    .map(ev => xorify(ev))
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas")
}

Cycle.run(main, drivers);
