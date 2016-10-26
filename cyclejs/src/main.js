import Cycle from '@cycle/core';
import GridDriver from './GridDriver';

let Rx = require(`rx-dom`)

function main(sources) {
    let gridDriver = sources.GridDriver();
    let dragger$ = gridDriver.dragger;
    let img$ = Rx.Observable.of({eventType : "img", imageFile: "file:///Users/rama/work/shuffalo/cyclejs/img/zero8.jpg"}); // TODO figure out how to put image in browserify package, don't hard code it here

    let gridEvent$ = dragger$.merge(img$);

    return {
	GridDriver: gridEvent$
    };
}

const drivers = {
    GridDriver: GridDriver.makeGridDriver("#canvas")
}

Cycle.run(main, drivers);
