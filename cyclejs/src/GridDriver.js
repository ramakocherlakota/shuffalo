const Rx = require(`rx-dom`)

const GridDriver = {
    makeGridDriver
}

function makeGridDriver(canvasElt) {

    const canvas = typeof canvasElt === `string` ?
	document.querySelector(canvasElt) :
	canvasElt

    return function(source$) {
        const mouseTracker$ = makeMouseTracker(canvas, source$);

	source$.filter(event => event.eventType === "redraw")
	    .subscribe(event => redraw(event, canvas))

        mouseTracker$.filter(evt => evt.eventType === "move")
            .subscribe(event => dragMouse(event, canvas))

        mouseTracker$.filter(evt => evt.eventType === "finishDrag")
            .subscribe(event => finishDrag(event, canvas))

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

function findByCells(direction, by, sz, canvas) {
    return Math.round(by * sz / canvasWidthOrHeight(direction, canvas)); 
}

function canvasWidthOrHeight(direction, canvas) {
    if (direction === 'horz') {
        return canvas.width;
    }
    else {
        return canvas.height;
    }
}

const slidingTimeMs = 100
const slidingFrames = 10

function finishDrag(p, canvas) {
    var byCells = findByCells(p.direction, p.by, p.size, canvas);
    var delta = byCells * canvasWidthOrHeight(p.direction, canvas) / p.size  - p.by;

    Rx.Observable.interval(slidingTimeMs / slidingFrames).take(slidingFrames)
        .forEach(n => {
            dragMouse({showGrid : p.showGrid,
                       direction : p.direction,
                       at : p.at,
                       size : p.size,
                       flip : p.flip,
                       by : p.by + delta * n / slidingFrames},
                      canvas)})
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
	const ctx = canvas.getContext('2d');
	ctx.drawImage(oCanvasGrid, 0, 0);
    }
}

function hideLines(canvas) {
    if (oCanvas) {
	const ctx = canvas.getContext('2d');
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
        var deltaWidth = oCanvas.width / event.size;
        var deltaHeight = oCanvas.height / event.size;

        var imgDeltaWidth = img.width / event.size;
        var imgDeltaHeight = img.height / event.size;

	var oContext = oCanvas.getContext("2d");
	var oContextGrid = oCanvasGrid.getContext("2d");

        // this is where we have to loop over the squares...
	// oContext.drawImage(img, 0, 0, oCanvas.width, oCanvas.height);
        for (var i=0; i<event.size; i++) {
            for (var j=0; j<event.size; j++) {
                let square = event.squares[i][j];
                oContext.drawImage(img, square.col * imgDeltaWidth, square.row * imgDeltaHeight, imgDeltaWidth, imgDeltaHeight, j*deltaWidth, i*deltaHeight, deltaWidth, deltaHeight);
                oContextGrid.drawImage(img, square.col * imgDeltaWidth, square.row * imgDeltaHeight, imgDeltaWidth, imgDeltaHeight, j*deltaWidth, i*deltaHeight, deltaWidth, deltaHeight);
            }
        }

	for (var j = 0; j<=event.size; j++) {
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

function makeMouseTracker(canvas, source$) {

    const showGrid$ = source$.filter(event => event.eventType === "redraw").pluck("showGrid")
    const size$ = source$.filter(event => event.eventType === "redraw").pluck("size")
    const flip$ = source$.filter(event => event.eventType === "redraw").pluck("flip")
    
    const mouseDown$ = Rx.DOM.mousedown(canvas);
    
    const down$ = mouseDown$.map(function (md) {
	md.preventDefault();
	
	return {eventType: "down", x : md.clientX, y : md.clientY};
    });
    
    down$.withLatestFrom(showGrid$, function(x, sg) {return sg === "on-press" || sg === "always";}) 
        .subscribe(sg => {if (sg) {showLines(canvas);}})
    
    const dragger$ = mouseDown$.flatMap(function (md) {
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
        
	const offsetFunctionMap = {
	    horz : function(p) {return p.x;},
	    vert : function(p) {return p.y;}
	};
        
	const startFunctionMap = {
	    horz : function(p) {return p.startY;},
	    vert : function(p) {return p.startX;}
	};
        
	const makeOutput = function(p, hv, sz, sg, fl) {
	    return {eventType: "move", showGrid : sg, size : sz, direction : hv, flip : fl, by : offsetFunctionMap[hv](p), at : startFunctionMap[hv](p)};
	}
        
	const movesWithDirection$ =  mouseMove$.withLatestFrom(firstDirection$, size$, showGrid$, flip$, makeOutput);
        
	const movesUntilDone$ = movesWithDirection$.takeUntil(Rx.DOM.mouseup(document).merge(Rx.DOM.mouseleave(document)));

	const finishDrag$ = movesUntilDone$.startWith({by : 0}).last().map(function(p) {
	    return {
                eventType : "finishDrag",
                direction : p.direction,
                by : p.by,
                at : p.at,
                size : p.size,
                flip : p.flip,
                showGrid : p.showGrid
	    };
	});

	const moveDone$ = movesUntilDone$.startWith({by : 0, at : 0})
            .last()
            .map(function(p) {
                return {
                    eventType : "moveDone",
                    direction : p.direction,
                    by : findByCells(p.direction, p.by, p.size, canvas),
                    at : findRowOrColumn(p.direction, p.at, p.size, canvas),
                    size : p.size
                };
	    })


	return movesUntilDone$.merge(finishDrag$).merge(moveDone$.delay(slidingTimeMs))
    });

    return dragger$;
}

module.exports = GridDriver
