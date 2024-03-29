const Rx = require(`rx-dom`)

const GridDriver = {
    makeGridDriver
}

function dumpSquare(square) {
    return "(" + square.row + ", " + square.col + ")" + (square.hflip ? " hflipped " : "") + (square.vflip ? " vflipped " : "")
}

function dumpSquares(squares) {
    let cells = squares.cells
    console.log((squares.hflip ? "hflipped " : "") + (squares.vflip ? "vflipped " : ""))
    for (let i=0; i<cells.length; i++) {
        var line = "";
        for (let j=0; j<cells.length; j++) {
            line += dumpSquare(cells[i][j]) + "; "
        }
        console.log(line)
    }
    console.log("")
}


// o stands for offscreen
var oCanvas = null; // without grid lines
var oCanvasGrid = null; // with grid lines

const slidingTimeMs = 100
const slidingFrames = 10


function makeGridDriver(canvasElt) {
    const ticker$ = Rx.Observable.interval(slidingTimeMs / slidingFrames)

    return function(source$) {
        var canvas = typeof canvasElt === `string` ?
	    document.querySelector(canvasElt) :
	    canvasElt

        const mouseTracker$ = makeMouseTracker(canvas, source$);

	source$.filter(event => event.eventType === "redraw")
	    .subscribe(event => redraw(event, canvas))

        mouseTracker$.filter(evt => evt.eventType === "move")
            .subscribe(event => dragMouse(event, canvas))

        mouseTracker$.filter(evt => evt.eventType === "finishDrag")
            .subscribe(event => finishDrag(event, canvas, ticker$))

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


function finishDrag(p, canvas, ticker$) {
    if (p.by != 0) {
        var byCells = findByCells(p.direction, p.by, p.size, canvas);
        var delta = byCells * canvasWidthOrHeight(p.direction, canvas) / p.size  - p.by;

        ticker$.take(slidingFrames + 1)
            .forEach(n => {
                dragMouse({showGrid : p.showGrid,
                           direction : p.direction,
                           at : p.at,
                           dragCanvas : p.dragCanvas,
                           lastFrame : n == slidingFrames,
                           size : p.size,
                           flip : p.flip,
                           by : p.by + delta * (n / slidingFrames)},
                          canvas)})
    }
}

function dragMouse(event, canvas) {
    var sourceCanvas = event.dragCanvas;

    var rowOrColumn = findRowOrColumn(event.direction, event.at, event.size, canvas);

    var ctx = canvas.getContext("2d");

    if (event.direction === 'horz') {
        var cellTop = Math.floor(rowOrColumn * canvas.height / event.size);
        var cellHeight = Math.floor(canvas.height / event.size);

        var by =  (event.by % sourceCanvas.width) + (event.by < 0 ? sourceCanvas.width : 0)

        ctx.drawImage(sourceCanvas, 
                      0, cellTop, sourceCanvas.width - by, cellHeight,
                      by, cellTop, sourceCanvas.width - by, cellHeight);
            

        if (by != 0) {
            ctx.drawImage(sourceCanvas, 
                          sourceCanvas.width - by, cellTop, by, cellHeight,
                          0, cellTop, by, cellHeight);
        }
        
        if (event.flip > 0 && rowOrColumn != (event.size - 1) / 2) {
            cellTop = Math.floor((event.size - 1 - rowOrColumn) * canvas.height / event.size);
            ctx.drawImage(sourceCanvas, 
                          0, cellTop, sourceCanvas.width - by, cellHeight,
                          by, cellTop, sourceCanvas.width - by, cellHeight);

            if (by != 0) {
                ctx.drawImage(sourceCanvas, 
                              sourceCanvas.width - by, cellTop, by, cellHeight,
                              0, cellTop, by, cellHeight);
            }
        }
    }
    else {
        var cellLeft = Math.floor(rowOrColumn * canvas.width / event.size);
        var cellWidth = Math.floor(canvas.width / event.size);

        var by =  (event.by % sourceCanvas.height) + (event.by < 0 ? sourceCanvas.height : 0)

        ctx.drawImage(sourceCanvas, 
                      cellLeft, 0, cellWidth, sourceCanvas.height - by,
                      cellLeft, by, cellWidth, sourceCanvas.height - by);
        
        if (by != 0) {
            ctx.drawImage(sourceCanvas, 
                          cellLeft, sourceCanvas.height - by, cellWidth, by,
                          cellLeft, 0, cellWidth, by);
        }
        
        
        if (event.flip > 1 && rowOrColumn != (event.size - 1) / 2) {
            cellLeft = Math.floor((event.size - 1 - rowOrColumn) * canvas.width / event.size);
            ctx.drawImage(sourceCanvas, 
                          cellLeft, 0, cellWidth, sourceCanvas.height - by,
                          cellLeft, by, cellWidth, sourceCanvas.height - by);
            
            if (by != 0) {
                ctx.drawImage(sourceCanvas, 
                              cellLeft, sourceCanvas.height - by, cellWidth, by,
                              cellLeft, 0, cellWidth, by);
            }
        }
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


function copySquare(src, srcX, srcY, srcWidth, srcHeight, dst, dstX, dstY, dstWidth, dstHeight, hflip, vflip) {
    if (hflip) {
        if (vflip) {
            dst.setTransform(-1, 0, 0, -1, dstWidth + dstX, dstHeight + dstY);            
        }
        else {
            dst.setTransform(1, 0, 0, -1, dstX, dstHeight + dstY);
        }
    }
    else if (vflip) {
        dst.setTransform(-1, 0, 0, 1, dstWidth + dstX, dstY);
    }
    else {
        dst.setTransform(1, 0, 0, 1, dstX, dstY);
    }
    dst.drawImage(src, srcX, srcY, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight);

    dst.setTransform(1, 0, 0, 1, 0, 0);
}

function redraw(event, canvas) {
    if (!canvas) {
        canvas = document.getElementById(event.canvasId)
        if (!canvas) {
            console.log("no canvas!")
            return;
        }
    }

    var size = event.size || 3;

    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;

    if (!oCanvas) {
	oCanvas = document.createElement("canvas");
	oCanvas.width = canvasWidth * 2;
	oCanvas.height = canvasHeight * 2;
	oCanvasGrid = document.createElement("canvas");
	oCanvasGrid.width = canvasWidth * 2;
	oCanvasGrid.height = canvasHeight * 2;
    }

    var img = new Image();
    img.src = "./dist/img/" + event.imageFile
    img.onload = function() {
        var deltaWidth = canvasWidth / size;
        var deltaHeight = canvasHeight / size;

        var imgDeltaWidth = img.width / size;
        var imgDeltaHeight = img.height / size;

	var oContext = oCanvas.getContext("2d");
	var oContextGrid = oCanvasGrid.getContext("2d");

        // this is where we have to loop over the squares...
        for (var i=0; i<size; i++) {
            for (var j=0; j<size; j++) {
                let square = event.squares.cells[i][j];
                copySquare(img, square.col * imgDeltaWidth, square.row * imgDeltaHeight, imgDeltaWidth, imgDeltaHeight, oContext, j*deltaWidth, i*deltaHeight, deltaWidth, deltaHeight, square.hflip, square.vflip);
                copySquare(img, square.col * imgDeltaWidth, square.row * imgDeltaHeight, imgDeltaWidth, imgDeltaHeight, oContextGrid, j*deltaWidth, i*deltaHeight, deltaWidth, deltaHeight, square.hflip, square.vflip);
            }
        }

	var ctx = canvas.getContext("2d");
	ctx.drawImage(oCanvas, 0, 0);

        // add the flipped versions as appropriate
        for (var v=0; v<2; v++) {
            for (var h=0; h<2; h++) {
                if (h > 0 || v > 0) {
                    let hflip = (h > 0 && event.hflip);
                    let vflip = (v > 0 && event.vflip);
                    copySquare(canvas, 0, 0, canvasWidth, canvasHeight, oContext, h * canvasWidth, v * canvasHeight, canvasWidth, canvasHeight, hflip, vflip);
                    copySquare(canvas, 0, 0, canvasWidth, canvasHeight, oContextGrid, h * canvasWidth, v * canvasHeight, canvasWidth, canvasHeight, hflip, vflip);
                }
            }
        }

	for (var j = 0; j<=4 * size; j++) {
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(j * deltaWidth, 0);
	    oContextGrid.lineTo(j * deltaWidth, oCanvas.height);
	    oContextGrid.stroke();
	    
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(0, j * deltaHeight);
	    oContextGrid.lineTo(oCanvas.width, j * deltaHeight);
	    oContextGrid.stroke();
	}

        if (event.showGrid == 'always') {
	    ctx.drawImage(oCanvasGrid, 0, 0);
        }
        else {
	    ctx.drawImage(oCanvas, 0, 0);
        }

        var debugCanvas = document.getElementById("debugCanvas");
        if (debugCanvas) {
	    var debugCtx = debugCanvas.getContext("2d");
            debugCtx.drawImage(oCanvasGrid, 0, 0);
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

	var dragCanvas = document.createElement("canvas");
	dragCanvas.width = canvas.width * 2;
	dragCanvas.height = canvas.height * 2;
        
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
	    var dragctx = dragCanvas.getContext("2d");

            if (sg == 'never') {
	        dragctx.drawImage(oCanvas, 0, 0);
            }
            else {
	        dragctx.drawImage(oCanvasGrid, 0, 0);
            }
            
	    return {eventType: "move", dragCanvas : dragCanvas, showGrid : sg, size : sz, direction : hv, flip : fl, by : offsetFunctionMap[hv](p), at : startFunctionMap[hv](p)};
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
                dragCanvas : dragCanvas,
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
                    flip : p.flip,
                    size : p.size
                };
	    })


	return movesUntilDone$.merge(finishDrag$).merge(moveDone$.delay(slidingTimeMs + (2 * slidingTimeMs) / slidingFrames))
    });

    return dragger$;
}

module.exports = GridDriver
