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

        // redraw events from source$
	const redrawOffscreen$ = source$.filter(event => event.eventType === "redraw").map(redrawOffscreen)

        const mouseTracker$ = makeMouseTracker(canvas, source$);
        const mouseDown$ = mouseTracker$.filter(evt => evt.eventType === "down")
        const mouseMove$ = mouseTracker$.filter(evt => evt.eventType === "move")
        const mouseUp$ = mouseTracker$.filter(evt => evt.eventType === "finishDrag")

        let offscreenCanvases$ = redrawOffscreen$.map(function(offscreen) {
            return {
                targetCanvas : canvas,
                sourceCanvas : offscreen.showGrid === "always" ? offscreen.canvasPlain : offscreen.canvasGrid,
            }
        })
        let imgLoad$ = redrawOffscreen$.flatMap(offscreen => offscreen.imgLoad)
        imgLoad$.withLatestFrom(offscreenCanvases$, function(img, canvases) {
            return canvases
        })
        .subscribe(drawOnscreen)

        mouseMove$.withLatestFrom(redrawOffscreen$, function(move, offscreen) {
            return {
                targetCanvas : canvas,
                sourceCanvas : move.showGrid === "never" ? offscreen.plainCanvas : offscreen.gridCanvas,
                direction : move.direction,
                at : move.at,
                size : move.size
            }
        })
        .subscribe(dragMouse)

        mouseUp$.combineLatest(redrawOffscreen$, function(up, offscreen) {
            return {
                ticker : ticker$,
                targetCanvas : canvas,
                sourceCanvas : move.showGrid === "never" ? offscreen.plainCanvas : offscreen.gridCanvas,
                direction : move.direction,
                at : move.at,
                size : move.size
            }
        })
        .subscribe(finishDrag)

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


function finishDrag(p, ticker$) {
    var canvas = p.targetCanvas;
    if (p.by != 0) {
        var byCells = findByCells(p.direction, p.by, p.size, canvas);
        var delta = byCells * canvasWidthOrHeight(p.direction, canvas) / p.size  - p.by;

        ticker$.take(slidingFrames + 1)
            .forEach(n => {
                dragMouse({showGrid : p.showGrid,
                           direction : p.direction,
                           at : p.at,
                           sourceCanvas : p.sourceCanvas,
                           lastFrame : n == slidingFrames,
                           size : p.size,
                           flip : p.flip,
                           by : p.by + delta * (n / slidingFrames)},
                          canvas)})
    }
}

function dragMouse(event) {
    var sourceCanvas = event.sourceCanvas;
    var targetCanvas = event.targetCanvas;

    var rowOrColumn = findRowOrColumn(event.direction, event.at, event.size, targetCanvas);

    var ctx = targetCanvas.getContext("2d");

    if (event.direction === 'horz') {
        var cellTop = Math.floor(rowOrColumn * targetCanvas.height / event.size);
        var cellHeight = Math.floor(targetCanvas.height / event.size);

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
            cellTop = Math.floor((event.size - 1 - rowOrColumn) * targetCanvas.height / event.size);
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
        var cellLeft = Math.floor(rowOrColumn * targetCanvas.width / event.size);
        var cellWidth = Math.floor(targetCanvas.width / event.size);

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
            cellLeft = Math.floor((event.size - 1 - rowOrColumn) * targetCanvas.width / event.size);
            ctx.drawImage(sourceCanvas, 
                          cellLeft, 0, cellWidth, sourceCanvas.height - by,
                          cellLeft, by, cellWidth, sourceCanvas.height - by);
            
            if (by != 0) {
                ctx.drawImage(sourceCanvas, 
                              cellLeft, targetCanvas.height - by, cellWidth, by,
                              cellLeft, 0, cellWidth, by);
            }
        }
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

function drawOnscreen(event) {
    var ctx = event.targetCanvas.getContext("2d");
    ctx.drawImage(event.sourceCanvas, 0, 0);
}

function redrawOffscreen(event) {
    let size = event.size || 3;
    let canvasWidth = event.canvasWidth;
    let canvasHeight = event.canvasHeight;

    let canvasPlain = document.createElement("canvas");
    canvasPlain.width = canvasWidth * 2;
    canvasPlain.height = canvasHeight * 2;

    let canvasGrid = document.createElement("canvas");
    canvasGrid.width = canvasWidth * 2;
    canvasGrid.height = canvasHeight * 2;

    var img = new Image();
    var imgLoad$ = Rx.Observable.fromEvent(img, "load")
    img.src = "./dist/img/" + event.imageFile
    imgLoad$.subscribe(function() {
        var deltaWidth = canvasWidth / size;
        var deltaHeight = canvasHeight / size;

        var imgDeltaWidth = img.width / size;
        var imgDeltaHeight = img.height / size;

	var oContext = canvasPlain.getContext("2d");
	var oContextGrid = canvasGrid.getContext("2d");

        // this is where we have to loop over the squares...
        for (var i=0; i<size; i++) {
            for (var j=0; j<size; j++) {
                let square = event.squares.cells[i][j];
                copySquare(img, square.col * imgDeltaWidth, square.row * imgDeltaHeight, imgDeltaWidth, imgDeltaHeight, oContext, j*deltaWidth, i*deltaHeight, deltaWidth, deltaHeight, square.hflip, square.vflip);
                copySquare(img, square.col * imgDeltaWidth, square.row * imgDeltaHeight, imgDeltaWidth, imgDeltaHeight, oContextGrid, j*deltaWidth, i*deltaHeight, deltaWidth, deltaHeight, square.hflip, square.vflip);
            }
        }

//        // add the flipped versions as appropriate
//        for (var v=0; v<2; v++) {
//            for (var h=0; h<2; h++) {
//                if (h > 0 || v > 0) {
//                    let hflip = (h > 0 && event.hflip);
//                    let vflip = (v > 0 && event.vflip);
//                    copySquare(oContext, 0, 0, canvasWidth, canvasHeight, oContext, h * canvasWidth, v * canvasHeight, canvasWidth, canvasHeight, hflip, vflip);
//                    copySquare(oContext, 0, 0, canvasWidth, canvasHeight, oContextGrid, h * canvasWidth, v * canvasHeight, canvasWidth, canvasHeight, hflip, vflip);
//                }
//            }
//        }

	for (var j = 0; j<=4 * size; j++) {
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(j * deltaWidth, 0);
	    oContextGrid.lineTo(j * deltaWidth, canvasHeight);
	    oContextGrid.stroke();
	    
	    oContextGrid.beginPath();
	    oContextGrid.moveTo(0, j * deltaHeight);
	    oContextGrid.lineTo(canvasWidth, j * deltaHeight);
	    oContextGrid.stroke();
	}

        

    })

    return {
        size : event.size,
        showGrid : event.showGrid,
        hflip : event.hflip,
        vflip : event.vflip,
        canvasWidth : event.canvasWidth,
        canvasHeight : event.canvasHeight,
        canvasPlain : canvasPlain,
        canvasGrid : canvasGrid,
        imgLoad : imgLoad$
    };
}

function makeMouseTracker(canvas, source$) {
    const showGrid$ = source$.filter(event => event.eventType === "redraw").pluck("showGrid")
    const size$ = source$.filter(event => event.eventType === "redraw").pluck("size")
    const flip$ = source$.filter(event => event.eventType === "redraw").pluck("flip")
    
    const mouseDown$ = Rx.DOM.mousedown(canvas);
    
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
        
	const movesWithDirection$ =  mouseMove$.withLatestFrom(firstDirection$, size$, showGrid$, flip$, 
                                                               function(p, hv, sz, sg, fl) {
	                                                           return {eventType: "move", showGrid : sg, size : sz, direction : hv, flip : fl, by : offsetFunctionMap[hv](p), at : startFunctionMap[hv](p)};
	                                                       });
        
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
                    flip : p.flip,
                    size : p.size
                };
	    })


	return Rx.Observable.just(md)
            .merge(movesUntilDone$)
            .merge(finishDrag$)
            .merge(moveDone$.delay(slidingTimeMs + (2 * slidingTimeMs) / slidingFrames))
    });

    return dragger$;
}

function printMe(name) {
    return function(x) {
        console.log("printing " + name)
        console.log(x)
    }
}

module.exports = GridDriver
