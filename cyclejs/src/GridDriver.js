let Rx = require(`rx-dom`)

let GridDriver = {
    makeGridDriver
}

function makeGridDriver(canvasElt) {

    let canvas = typeof canvasElt === `string` ?
	document.querySelector(canvasElt) :
	canvasElt

    let mouseTracker$ = makeMouseTracker(canvas);

    return function(source$) {
	source$
	    .subscribe(event => console.log(event));

	source$.filter(event => event.eventType === "showLines")
	    .subscribe(event => showLines(event, canvas))

	source$.filter(event => event.eventType === "hideLines")
	    .subscribe(event => hideLines(event, canvas))

	return mouseTracker$;
    }    
}

function drawSquare(squareProps, canvas) {

}

function showLines(xorProps, canvas) {
    console.log("show lines");
}

function hideLines(xorProps, canvas) {
    console.log("hide lines");
}

function makeMouseTracker(draggable) {

    return function mouseTrack() {

	var mouseDown$ = Rx.DOM.mousedown(draggable);
	
	var down$ = mouseDown$.map(function (md) {
	    md.preventDefault();
	    
	    return {eventType: "down", x : md.clientX, y : md.clientY};
	});

	var up$ = mouseDown$.flatMap(function (md) {
	    md.preventDefault();

	    return Rx.DOM.mouseup(document).merge(Rx.DOM.mouseleave(document)).map(function(mu) {
		return {eventType: "up", startX : md.clientX, startY : md.clientY, x : mu.clientX - md.clientX, y : mu.clientY - md.clientY}
	    }).first(); // why do I need this first() ?  without it I get multiple events accumulating
	});

	var dragger$ = mouseDown$.flatMap(function (md) {
	    md.preventDefault();

	    var mouseMove$ =  Rx.DOM.mousemove(document)
		.map(function (mm) {return {startX : md.clientX, startY : md.clientY, x : mm.clientX - md.clientX, y : mm.clientY - md.clientY};})
		.filter(function(p) {return p.x != p.y;});
	    
	    var firstDirection$ = mouseMove$.map(function(p) {
		if (Math.abs(p.x) > Math.abs(p.y)) {
		    return "horz";
		}
		else {
		    return "vert";
		}})
		.first();

	    var offsetFunctionMap = {
		horz : function(p) {return p.x;},
		vert : function(p) {return p.y;}
	    };

	    var startFunctionMap = {
		horz : function(p) {return p.startY;},
		vert : function(p) {return p.startX;}
	    };

	    var makeOutput = function(p, hv) {
		return {eventType: "move", direction : hv, by : offsetFunctionMap[hv](p), at : startFunctionMap[hv](p)};
	    }

	    var movesWithDirection$ =  mouseMove$.withLatestFrom(firstDirection$, makeOutput);

	    var movesUntilDone$ = movesWithDirection$.takeUntil(Rx.DOM.mouseup(document).merge(Rx.DOM.mouseleave(document)));

	    var moveDone$ = movesUntilDone$.startWith({by : 0}).last().map(function(p) {
		return {
		    eventType : "moveDone",
		    direction : p.direction,
		    by : p.by,
		    at : p.at
		};
	    });


	    return movesUntilDone$.merge(moveDone$)
	});

	return {down : down$,
		up : up$,
		dragger : dragger$};
    }
}

module.exports = GridDriver
