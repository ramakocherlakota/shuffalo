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

	source$.filter(event => event.eventType === "redraw")
	    .subscribe(event => redraw(event, canvas))

        mouseTracker$.filter(evt => evt.eventType === "move")
            .subscribe(event => dragMouse(event, canvas))

	return mouseTracker$.filter(evt => evt.eventType === "moveDone")
    }    
}

function findRowOrColumn(direction, at, sz, canvas) {
    if (direction === 'horz') {
        return Math.floor(at * sz / canvas.height); 
    }
    else {
        return Math.floor(at * sz / canvas.width);
    }
}

function dragMouse(event, canvas) {
    var sourceCanvas = (event.showGrid === 'never') ? 
        oCanvas :
        oCanvasGrid;

    var rowOrColumn = findRowOrColumn(event.direction, event.at, event.size, canvas);

    var ctx = canvas.getContext("2d");
    if (event.flip > 0) {
        dragMouseFlip(event, sourceCanvas, ctx, rowOrColumn);        
    }
    else {
        dragMouseStraight(event, sourceCanvas, ctx, rowOrColumn);        
    }
}


function dragMouseFlip(event, sourceCanvas, ctx, rowOrColumn) {
    console.log("dragMouseFlip flip=" + event.flip);
}

function dragMouseStraight(event, sourceCanvas, ctx, rowOrColumn) {

    if (event.direction === 'horz') {
        var cellTop = Math.floor(rowOrColumn * canvas.height / event.size);
        var cellHeight = Math.floor(canvas.height / event.size);

        var by =  (event.by % canvas.width) + (event.by < 0 ? canvas.width : 0)

        ctx.drawImage(sourceCanvas, 
                      0, cellTop, canvas.width - by, cellHeight,
                      by, cellTop, canvas.width - by, cellHeight);
        
        ctx.drawImage(sourceCanvas, 
                      canvas.width - by, cellTop, by, cellHeight,
                      0, cellTop, by, cellHeight);
    }
    else {
        var cellLeft = Math.floor(rowOrColumn * canvas.width / event.size);
        var cellWidth = Math.floor(canvas.width / event.size);

        var by =  (event.by % canvas.height) + (event.by < 0 ? canvas.height : 0)

        ctx.drawImage(sourceCanvas, 
                      cellLeft, 0, cellWidth, canvas.height - by,
                      cellLeft, by, cellWidth, canvas.height - by);
        
        ctx.drawImage(sourceCanvas, 
                      cellLeft, canvas.height - by, cellWidth, by,
                      cellLeft, 0, cellWidth, by);
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

function redraw(event, canvas) {
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

	var oContextGrid = oCanvasGrid.getContext("2d");

	oContextGrid.drawImage(img, 0, 0, oCanvas.width, oCanvas.height);
        var deltaWidth = oCanvas.width / event.size;
        var deltaHeight = oCanvas.height / event.size;
	for (var j = 1; j<event.size; j++) {
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(j * deltaWidth, 0);
	    oContextGrid.lineTo(j * deltaWidth, oCanvas.height);
	    oContextGrid.stroke();
	    
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(0, j * deltaHeight);
	    oContextGrid.lineTo(oCanvas.width, j * deltaHeight);
	    oContextGrid.stroke();
	}

	var ctx = canvas.getContext("2d");
        if (event.showGrid == 'always') {
	    ctx.drawImage(oCanvasGrid, 0, 0);
        }
        else {
	    ctx.drawImage(oCanvas, 0, 0);
        }
    }
    img.onerror = function(err) {
	// TODO do something useful
	console.log("Error loading image: " + err);
    }

}

function makeMouseTracker(draggable, source$) {

    let showGrid$ = source$.filter(event => event.eventType === "redraw").pluck("showGrid")
    let size$ = source$.filter(event => event.eventType === "redraw").pluck("size")
    let flip$ = source$.filter(event => event.eventType === "redraw").pluck("flip")
    
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
	    .map(function (mm) {return {startX : md.offsetX, startY : md.offsetY, x : mm.offsetX - md.offsetX, y : mm.offsetY - md.offsetY};})
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
        
	let makeOutput = function(p, hv, sz, sg, fl) {
	    return {eventType: "move", showGrid : sg, size : sz, direction : hv, flip : fl, by : offsetFunctionMap[hv](p), at : startFunctionMap[hv](p)};
	}
        
	let movesWithDirection$ =  mouseMove$.withLatestFrom(firstDirection$, size$, showGrid$, flip$, makeOutput);
        
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

    return dragger$;
}

module.exports = GridDriver
