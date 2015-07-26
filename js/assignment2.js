(function(){
	'use strict';

	$(document).ready(init);

	function init() {
		var canvas = $('#gl-canvas');

		//resizeCanvas(canvas);

		var gl = WebGLUtils.setupWebGL(canvas.get(0), {preserveDrawingBuffer: true});
		if (!gl) {alert('WebGL isn\'t available');}

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		//gl.lineWidth(1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		var drawingData = {
			'isDrawing': false,
			'currentTrace': null,
			'vertCount': 0,
			//'traces': []
		};

		// bind events
		//$(window).resize({'canvas': canvas, 'gl': gl, 'drawingData': drawingData, 'vBuffer': vBuffer}, resizeCanvasHandler);
		canvas.mousedown({'gl': gl, 'drawingData': drawingData}, drawStartHandler);
		canvas.mousemove({'gl': gl, 'drawingData': drawingData}, drawProcessingHandler);
		canvas.mouseup({'gl': gl, 'drawingData': drawingData}, drawEndHandler);
		canvas.mouseout({'gl': gl, 'drawingData': drawingData}, drawEndHandler);
		$('#options').change({'options': options}, changeOptionsHandler);
	}

	function changeOptionsHandler(event){
		event.data.options = readOptions();
	}

	function drawStartHandler(event){
		var canvas = event.target;
		event.data.drawingData.isDrawing = true;
		var options = readOptions();
		var currentTrace = new glTrace([new Point(event.pageX, event.pageY)], event.data.gl, options);
		event.data.drawingData.currentTrace = currentTrace;
	}

	function drawProcessingHandler(event){
		if (event.data.drawingData.isDrawing) {
			var trace = event.data.drawingData.currentTrace;
				trace.points.push(new Point(event.pageX, event.pageY));
				trace.render();
		}
	}

	function drawEndHandler(event){
		if (event.data.drawingData.isDrawing) {
			var trace = event.data.drawingData.currentTrace;
			var newPoint = new Point(event.pageX, event.pageY);
			if (trace.points.length > 0) {
				var prevPoint = trace.points[trace.points.length - 1];
				if (newPoint.x != prevPoint.x || newPoint.y != newPoint.y) {
					trace.points.push(newPoint);
					trace.render();
				}
			}
		}
		event.data.drawingData.isDrawing = false;
	}

	function resizeCanvas(canvas) {
		canvas.width($(window).innerWidth());
		canvas.height($(window).innerHeight());
	}

	function resizeCanvasHandler(event) {
		var canvas = event.data.canvas;
		var gl = event.data.gl;
		resizeCanvas(canvas);
	}

	function readOptions() {
		var formData = $('#options').serializeArray();
		var options = {};
		$.each(formData, function(index, item){
			options[item['name']] = item['value'];
		});
		var color = tinycolor(options['color']);
		if (!color.isValid()){
			color = tinycolor('#000000');
		}
		return {
			'lineWidth': parseInt(options['width'] || 2),
			'color': color.toRgb()
		}
	}

	function glTrace(points, gl, options) {
		this.points = points || [];
		this.options = options || {};
		this.gl = gl;
		this.renderIndex = null;
		this._initBuffers();
	}

	glTrace.prototype._initBuffers = function() {
		var gl = this.gl;
		var program = initShaders(gl, 'vertex-shader', 'fragment-shader');
		gl.useProgram(program);

		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, 50000, gl.DYNAMIC_DRAW);

		var vPosition = gl.getAttribLocation(program, 'vPosition');
		gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		var cBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, 50000, gl.DYNAMIC_DRAW);

		// shader variables for color data buffer
		var vColor = gl.getAttribLocation(program, 'vColor');
		gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vColor);
		
		this.vBuffer = vBuffer;
		this.cBuffer = cBuffer;
	}

	glTrace.prototype.render = function() {
		this.isRendering = true;
		var gl = this.gl;
		var prevPoint = null;
		var width = $(gl.canvas).width();
		var height = $(gl.canvas).height();
		var options = this.options;
		var renderIndex = this.renderIndex;
		var newIndex = null;
		var verteces = [];
		var colors = [];

		$.each(this.points, function(index, point) {
			if (prevPoint && (!renderIndex || renderIndex < index)) {
				var lineWidth = options.lineWidth,
					dX = point.x - prevPoint.x,
					dY = point.y - prevPoint.y,
					t = Math.sqrt(Math.pow(lineWidth, 2) / (Math.pow(dX, 2) + Math.pow(dY, 2))),
					normalX = t * -dY,
					normalY = t * dX;
				var a = new Point(prevPoint.x - normalX, prevPoint.y - normalY).toClip(width, height);
				var b = new Point(prevPoint.x + normalX, prevPoint.y + normalY).toClip(width, height);
				var c = new Point(point.x - normalX, point.y - normalY).toClip(width, height);
				var d = new Point(point.x + normalX, point.y + normalY).toClip(width, height);
				verteces.push(a.vec2(), b.vec2(), c.vec2(), d.vec2());
				for (var i=0; i<4; i++) {
					colors.push(options.color.r/255, options.color.g/255, options.color.b/255);
				}
				newIndex = index;
			}
			prevPoint = point;
		});

		if (renderIndex > 0) {
			var num = this.renderIndex * 4;
			var vOffset = sizeof.vec2 * this.renderIndex * 4;
			var colorOffset = sizeof.vec3 * this.renderIndex * 4;
		}
		else {
			var num = 0;
			var vOffset = 0;
			var colorOffset = 0;
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, vOffset, flatten(verteces));

		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, colorOffset, flatten(colors));

		//gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, num + verteces.length);

		this.renderIndex = newIndex;
	}

	function Point(x, y, color) {
		this.x = x || 0;
		this.y = y || 0;
		this.color = color || null;
	}
	Point.prototype.x = null;
	Point.prototype.y = null;
	Point.prototype.vec2 = function() {
		return vec2(this.x, this.y);
	}
	Point.prototype.toClip = function(width, height) {
		var x = convertX(this.x, width);
		var y = convertY(this.y, height);
		return new Point(x, y);
		function convertX(coord, width) {
			var numerator = 2.0 * coord;
			var scaled = numerator / width;
			return -1 + scaled;
		}
		function convertY(coord, height) {
			var numerator = 2.0 * (height - coord);
			var scaled = numerator / height;
			return -1 + scaled;
		}
	}

})();
