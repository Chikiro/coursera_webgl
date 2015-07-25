(function(){
	'use strict';

	$(document).ready(init);

	function init() {
		var canvas = $('#gl-canvas');

		//resizeCanvas(canvas);

		var gl = WebGLUtils.setupWebGL(canvas.get(0), {preserveDrawingBuffer: true});
		if (!gl) {alert('WebGL isn\'t available');}

		gl.viewport(0, 0, canvas.width(), canvas.height());
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.lineWidth(1);
		var program = initShaders(gl, 'vertex-shader', 'fragment-shader');
		gl.useProgram(program);

		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, 100000, gl.DYNAMIC_DRAW);

		// shader variables for vertex data buffer
		var vPosition = gl.getAttribLocation(program, 'vPosition');
		gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		//gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		//gl.clear(gl.COLOR_BUFFER_BIT);
		//gl.drawArrays(gl.TRIANGLES, 0, verteces.length);

		// color buffer
		var cBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, 100000, gl.DYNAMIC_DRAW);

		// shader variables for color data buffer
		var vColor = gl.getAttribLocation(program, 'vColor');
		gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
		//gl.vertexAttribPointer(vColor, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vColor);

		var drawingData = {
			'isDrawing': false,
			'points': [],
			//'shapes': []
		};

		drawLine([], gl, vBuffer, cBuffer, canvas);

		// bind events
		//$(window).resize({'canvas': canvas, 'gl': gl, 'drawingData': drawingData, 'vBuffer': vBuffer}, resizeCanvasHandler);
		canvas.mousedown({'gl': gl, 'drawingData': drawingData, 'vBuffer': vBuffer, 'cBuffer': cBuffer}, drawStartHandler);
		canvas.mousemove({'gl': gl, 'drawingData': drawingData, 'vBuffer': vBuffer, 'cBuffer': cBuffer}, drawProcessingHandler);
		canvas.mouseup({'gl': gl, 'drawingData': drawingData, 'vBuffer': vBuffer, 'cBuffer': cBuffer}, drawEndHandler);
		canvas.mouseout({'gl': gl, 'drawingData': drawingData, 'vBuffer': vBuffer, 'cBuffer': cBuffer}, drawEndHandler);
		$('#options').change({'options': options}, changeOptionsHandler);
	}

	function changeOptionsHandler(event){
		event.data.options = readOptions();
	}

	function drawStartHandler(event){
		var canvas = event.target;
		event.data.drawingData.isDrawing = true;
		event.data.drawingData.points.push(new Point(event.pageX, event.pageY));
	}

	function drawProcessingHandler(event){
		var canvas = event.target;
		if (event.data.drawingData.isDrawing) {
			event.data.drawingData.points.push(new Point(event.pageX, event.pageY));
			drawLine(event.data.drawingData.points, event.data.gl, event.data.vBuffer, event.data.cBuffer, $(event.target));
		}
	}

	function drawEndHandler(event){
		event.data.drawingData.points.push(new Point(event.pageX, event.pageY));
		event.data.drawingData.isDrawing = false;
		//event.data.drawingData.shapes.push(event.data.drawingData.points.slice(0));
		event.data.drawingData.points = [];
	}

	function resizeCanvas(canvas) {
		canvas.width($(window).innerWidth());
		canvas.height($(window).innerHeight());
	}

	function resizeCanvasHandler(event) {
		var canvas = event.data.canvas;
		var gl = event.data.gl;
		resizeCanvas(canvas);
		render(gl);
	}

	function drawLine(points, gl, vBuffer, cBuffer, canvas) {
		var options = readOptions();
		var verteces = [];
		var colors = [];
		var prevPoint = null;
		var width = canvas.width();
		var height = canvas.height();

		$.each(points, function(index, point) {
			if (prevPoint) {
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
			}
			prevPoint = point;
		});

		
		var vOffset = 0; //sizeof.vec2 * 4 * verteces.length;
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, vOffset, flatten(verteces));

		var colorOffset = 0; //sizeof.vec3 * verteces.length;
		gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, colorOffset, flatten(colors));

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, verteces.length);
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
