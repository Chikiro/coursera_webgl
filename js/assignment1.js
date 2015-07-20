'use strict';

var gl;
var program;
var initTriangle = [
	vec2(-0.5, -0.5),
	vec2(0, 0.5),
	vec2(0.5, -0.5)
];
var initSquare = [
	vec2(-0.5, -0.5),
	vec2(0.5, -0.5),
	vec2(0.5, 0.5),
	vec2(0.5, 0.5),
	vec2(-0.5, 0.5),
	vec2(-0.5, -0.5),
];


function middlePoint(point1, point2) {
  return mix(point1, point2, 0.5);
};

function distance(point) {
  return Math.sqrt(Math.pow(point[0], 2) + Math.pow(point[1], 2));
};

function rotation(point, theta) {
	var dist = distance(point);
	var x = point[0];
	var y = point[1];
	var rotatedX = (x * Math.cos(dist * theta)) - (y * Math.sin(dist * theta));
	var rotatedY = (x * Math.sin(dist * theta)) + (y * Math.cos(dist * theta));
	return vec2(rotatedX, rotatedY);
};


function degree2Radiant(value) {
	return (Math.PI / 180) * value;
}


function triangle(a, b, c, count, isGasket) {
	var pts = [];
	getPoints(a, b, c, count, isGasket);
	
	return pts;
	
	function getPoints(a, b, c, count, isGasket){
		var ab, ac, bc;
		if (count === 0) {
			pts.push(a, b, c);
		} else {
			ab = middlePoint(a, b);
			ac = middlePoint(a, c);
			bc = middlePoint(b, c);

			--count;
			getPoints(a, ab, ac, count, isGasket);
			getPoints(c, ac, bc, count, isGasket);
			getPoints(b, bc, ab, count, isGasket);
			
			if (!isGasket) {
				getPoints(ac, ab, bc, count, isGasket);
			}
		}
	}
};


function square(a, b, c, d, count) {
	var pts = [];
	getPoints(a, b, c, d, count);

	return pts;

	function getPoints(a, b, c, d, count) {
		var ab, bc, cd, ad, abcd;

		if (count === 0) {
			pts.push(a, b, c);
			pts.push(c, d, a);
		} else {
			ab = middlePoint(a, b);
			bc = middlePoint(b, c);
			cd = middlePoint(c, d);
			ae = middlePoint(a, d);
			aebc = middlePoint(ad, bc);

			--count;
			getPoints(ab, b, bc, abcd, count);
			getPoints(ad, abcd, cd, d, count);
			getPoints(abcd, bc, c, cd, count);
			getPoints(a, ab, abcd, ad, count);
		}
	}
};


function readOptions() {
	var formData = $('#options').serializeArray();
	var options = {};
	$.each(formData, function(index, item){
		options[item['name']] = item['value'];
	});
	return {
		'divisions': parseInt(options['divisions'] || 5),
		'rotateDegree': parseInt(options['rotateDegree'] || 60),
		'isGasket': 'isGasket' in options,
		'shape': options['shape'] || 'triangle',
		'fill': options['fill'] || 'mesh'
	}
}


function rotateShape(pts, value){
	return pts.map(function(vertex) {
		return rotation(vertex, degree2Radiant(value));
	});
}


function drawShape(options) {
	var pts = [];
	if (options.shape == 'square') {
		pts = square(initSquare[0], initSquare[1], initSquare[2], initSquare[4], options.divisions);
	}
	if (options.shape == 'triangle') {
		pts = triangle(initTriangle[0], initTriangle[1], initTriangle[2], options.divisions, options.isGasket);
	}

	pts = rotateShape(pts, options.rotateDegree);

	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(pts), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, 'vPosition');
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	render(pts, options);
}


function render(pts, options) {
	gl.clear(gl.COLOR_BUFFER_BIT);
	if (options.fill == 'solid') {
		gl.drawArrays(gl.TRIANGLES, 0, pts.length);
	}
	if (options.fill == 'mesh') {
		for (var i=0; i<pts.length; i+=3) {
			gl.drawArrays(gl.LINE_LOOP, i, 3);
		}
	}
};


window.onload = function init() {

	var canvas = document.getElementById('gl-canvas');
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {alert('WebGL isn\'t available');}

	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(1.0, 1.0, 1.0, 0.0);

	program = initShaders(gl, 'vertex-shader', 'fragment-shader');
	gl.useProgram(program);

	var options = readOptions();
	
	drawShape(options);

	$('#options').change(function(event){
		event.preventDefault();
		var options = readOptions();
		drawShape(options);
	});
};
