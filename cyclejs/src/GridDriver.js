// TODO get rid of tabs, use spaces

let Rx = require(`rx-dom`)

let GridDriver = {
    makeGridDriver
}

function makeGridDriver(canvasElt) {

    let canvas = typeof canvasElt === `string` ?
	document.querySelector(canvasElt) :
	canvasElt

    return function(source$) {
        let mouseTracker$ = makeMouseTracker(canvas, source$);

	source$.filter(event => event.eventType === "img")
	    .subscribe(event => img(event, canvas))

	return mouseTracker$;
    }    
}

function showLines(canvas) {
    if (oCanvasGrid) {
	let ctx = canvas.getContext('2d');
	ctx.drawImage(oCanvasGrid, 0, 0);
    }
}

function hideLines(canvas) {
    if (oCanvas) {
	let ctx = canvas.getContext('2d');
	ctx.drawImage(oCanvas, 0, 0);
    }
}

// o stands for offscreen
var oCanvas = null; // without grid lines
var oCanvasGrid = null; // with grid lines

function img(event, canvas) {
    if (!oCanvas) {
	oCanvas = document.createElement("canvas");
	oCanvas.width = canvas.width;
	oCanvas.height = canvas.height;
	oCanvasGrid = document.createElement("canvas");
	oCanvasGrid.width = canvas.width;
	oCanvasGrid.height = canvas.height;
    }

    var img = new Image();
    img.src = event.imageFile;
    img.onload = function() {
	var oContext = oCanvas.getContext("2d");
	oContext.drawImage(img, 0, 0, oCanvas.width, oCanvas.height);

	var ctx = canvas.getContext("2d");
	ctx.drawImage(oCanvas, 0, 0);

	var oContextGrid = oCanvasGrid.getContext("2d");

	// TODO hard-coded gridding
	oContextGrid.drawImage(img, 0, 0, oCanvas.width, oCanvas.height);
	for (var j = 1; j<10; j++) {
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(j * 30, 0);
	    oContextGrid.lineTo(j * 30, oCanvas.height);
	    oContextGrid.stroke();
	    
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(0, j * 40);
	    oContextGrid.lineTo(oCanvas.width, j * 40);
	    oContextGrid.stroke();
	}
    }
    img.onerror = function(err) {
	// TODO do something useful
	console.log("Error loading image: " + err);
    }

}

function makeMouseTracker(draggable, source$) {

    let showGrid$ = source$.filter(event => event.eventType === "showGrid").pluck("value")
    showGrid$.subscribe(sg => {if (sg === "always") showLines(draggable);
                               else hideLines(draggable);});
                                   
    
    let mouseDown$ = Rx.DOM.mousedown(draggable);
    
    let down$ = mouseDown$.map(function (md) {
	md.preventDefault();
	
	return {eventType: "down", x : md.clientX, y : md.clientY};
    });
    
    down$.withLatestFrom(showGrid$, function(x, sg) {return sg === "on-press" || sg === "always";}) 
        .subscribe(sg => {if (sg) {showLines(draggable);}})
    
    let up$ = mouseDown$.flatMap(function (md) {
	md.preventDefault();
        
	return Rx.DOM.mouseup(document).merge(Rx.DOM.mouseleave(document)).map(function(mu) {
	    return {eventType: "up", startX : md.clientX, startY : md.clientY, x : mu.clientX - md.clientX, y : mu.clientY - md.clientY}
	}).first(); // why do I need this first() ?  without it I get multiple events accumulating
    });
    
    up$.withLatestFrom(showGrid$, function(x, sg) {return sg === "on-press" || sg === "never";}) 
        .subscribe(sg => {if (sg) {hideLines(draggable);}})
    
    let dragger$ = mouseDown$.flatMap(function (md) {
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
        
	let offsetFunctionMap = {
	    horz : function(p) {return p.x;},
	    vert : function(p) {return p.y;}
	};
        
	let startFunctionMap = {
	    horz : function(p) {return p.startY;},
	    vert : function(p) {return p.startX;}
	};
        
	let makeOutput = function(p, hv) {
	    return {eventType: "move", direction : hv, by : offsetFunctionMap[hv](p), at : startFunctionMap[hv](p)};
	}
        
	let movesWithDirection$ =  mouseMove$.withLatestFrom(firstDirection$, makeOutput);
        
	let movesUntilDone$ = movesWithDirection$.takeUntil(Rx.DOM.mouseup(document).merge(Rx.DOM.mouseleave(document)));

	let moveDone$ = movesUntilDone$.startWith({by : 0}).last().map(function(p) {
	    return {
		eventType : "moveDone",
		direction : p.direction,
		by : p.by,
		at : p.at
	    };
	});


	return movesUntilDone$.merge(moveDone$)
    });

    dragger$.filter(event => event.eventType === "move")
        .subscribe(event => console.log("moved mouse (and I saw you!)"))

    return {moveDone : dragger$.filter(evt => evt.eventType === "moveDone")}

}

module.exports = GridDriver
