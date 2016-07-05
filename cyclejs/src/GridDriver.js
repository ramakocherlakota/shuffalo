let Rx = require(`rx-dom`)

let GridDriver = {
    makeGridDriver
}

function makeGridDriver(canvasElt) {

    let canvas = typeof canvasElt === `string` ?
	document.querySelector(canvasElt) :
	canvasElt

    let mouseTracker$ = makeMouseTracker(canvas);

    return function track(source$) {
	source$.filter(event => event.eventType === "square")
	    .subscribe(event => drawSquare(event, canvas))

	source$.filter(event => event.eventType === "xor")
	    .subscribe(event => drawXor(event, canvas))

	return mouseTracker$;
    }    
}

function drawSquare(squareProps, canvas) {

}

function drawXor(xorProps, canvas) {

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

	    var followMouseHV$ =  mouseMove$.withLatestFrom(firstDirection$, makeOutput);

	    return followMouseHV$.takeUntil(Rx.DOM.mouseup(document).merge(Rx.DOM.mouseleave(document)));

	});

	return down$.merge(up$).merge(dragger$);
    }
}

module.exports = GridDriver
