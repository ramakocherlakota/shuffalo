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

	source$.filter(event => event.eventType === "img")
	    .subscribe(event => img(event, canvas))

	return mouseTracker$;
    }    
}

function showLines(event, canvas) {
    console.log("show lines");
    if (oCanvasGrid) {
	var ctx = canvas.getContext('2d');
	ctx.drawImage(oCanvasGrid, 0, 0);
    }
}

function hideLines(event, canvas) {
    console.log("hide lines");
    if (oCanvas) {
	var ctx = canvas.getContext('2d');
	ctx.drawImage(oCanvas, 0, 0);
    }
}

// o stands for offscreen
var oCanvas = null; // without grid lines
var oCanvasGrid = null; // with grid lines

function img(event, canvas) {
    console.log("draw image");
    if (!oCanvas) {
	oCanvas = document.createElement("canvas");
	oCanvas.width = canvas.width;
	oCanvas.height = canvas.height;
	oCanvasGrid = document.createElement("canvas");
	oCanvasGrid.width = canvas.width;
	oCanvasGrid.height = canvas.height;
    }

    var oContext = oCanvas.getContext("2d");
    oContext.fillStyle = "orange";
    oContext.fillRect(0, 0, 100, 100);

    var oContextGrid = oCanvasGrid.getContext("2d");
    oContextGrid.fillStyle = "blue";
    oContextGrid.fillRect(0, 0, 100, 100);

    hideLines(event, canvas);
}

function makeMouseTracker(draggable) {

    return function() {

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
